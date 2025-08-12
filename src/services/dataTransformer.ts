// ================================================================
// src/services/dataTransformer.ts
// ================================================================

import { OpenLibraryBook } from '@/types/openLibrary';
import { TransformedBookData, TransformedAuthorData, TransformedCategoryData } from '@/types/bookData';
import { normalizeIsbn } from '@/utils/isbn';

export class DataTransformer {
  /**
   * Transform Open Library book data to our internal format
   */
  static transformBook(olBook: OpenLibraryBook, isbn: string): TransformedBookData {
    const normalizedIsbn = normalizeIsbn(isbn);
    if (!normalizedIsbn) {
      throw new Error(`Invalid ISBN provided for transformation: ${isbn}`);
    }

    return {
      isbnCode: normalizedIsbn,
      title: DataTransformer.extractTitle(olBook),
      subtitle: olBook.subtitle,
      authors: DataTransformer.extractAuthors(olBook),
      categories: DataTransformer.extractCategories(olBook),
      editionNumber: DataTransformer.extractEditionNumber(olBook),
      editionDate: DataTransformer.extractEditionDate(olBook),
      publishers: olBook.publishers,
      pages: olBook.number_of_pages,
      language: DataTransformer.extractLanguage(olBook),
      coverUrls: DataTransformer.extractCoverUrls(olBook),
      description: olBook.notes,
      physicalFormat: olBook.physical_format,
      weight: olBook.weight,
      dimensions: olBook.physical_dimensions,
    };
  }

  private static extractTitle(olBook: OpenLibraryBook): string {
    return olBook.title?.trim() || 'Unknown Title';
  }

  private static extractAuthors(olBook: OpenLibraryBook): TransformedAuthorData[] {
    if (!olBook.authors || olBook.authors.length === 0) {
      return [];
    }

    return olBook.authors.map(author => {
      const fullName = author.name.trim();
      const { name, surname } = DataTransformer.parseAuthorName(fullName);
      
      return {
        name,
        surname,
        fullName,
        nationality: undefined, // Open Library doesn't provide nationality in book API
      };
    });
  }

  private static parseAuthorName(fullName: string): { name: string; surname: string } {
    const parts = fullName.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return { name: 'Unknown', surname: 'Author' };
    }
    
    if (parts.length === 1) {
      return { name: parts[0]!, surname: '' };
    }
    
    // Handle "Last, First" format
    if (fullName.includes(',')) {
        const splitParts = fullName.split(',');
        const lastName = splitParts[0];
        const firstParts = splitParts.slice(1);
        const firstName = firstParts.join(' ').trim();
        return {
            name: firstName || lastName!.trim(),
            surname: firstName ? lastName!.trim() : '',
        };
    }
    
    // Handle "First Last" or "First Middle Last" format
    const surname = parts[parts.length - 1]!;
    const name = parts.slice(0, -1).join(' ');
    
    return { name, surname };
  }

  private static extractCategories(olBook: OpenLibraryBook): TransformedCategoryData[] {
    const categories: TransformedCategoryData[] = [];
    
    // Extract subjects
    if (olBook.subjects) {
      olBook.subjects.forEach(subject => {
        if (subject && subject.trim().length > 0) {
          categories.push({
            name: DataTransformer.normalizeCategory(subject),
            type: 'subject',
          });
        }
      });
    }
    
    // Extract subject places as topics
    if (olBook.subject_places) {
      olBook.subject_places.forEach(place => {
        if (place && place.trim().length > 0) {
          categories.push({
            name: DataTransformer.normalizeCategory(place),
            type: 'topic',
          });
        }
      });
    }
    
    // Extract subject times as topics
    if (olBook.subject_times) {
      olBook.subject_times.forEach(time => {
        if (time && time.trim().length > 0) {
          categories.push({
            name: DataTransformer.normalizeCategory(time),
            type: 'topic',
          });
        }
      });
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueCategories = DataTransformer.deduplicateCategories(categories);
    return uniqueCategories.slice(0, 10); // Limit to 10 categories max
  }

  private static normalizeCategory(category: string): string {
    return category
      .trim()
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private static deduplicateCategories(categories: TransformedCategoryData[]): TransformedCategoryData[] {
    const seen = new Set<string>();
    return categories.filter(category => {
      const key = `${category.name.toLowerCase()}-${category.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private static extractEditionNumber(olBook: OpenLibraryBook): number | undefined {
    // Try to extract edition number from title or other fields
    const title = olBook.title || '';
    const editionMatch = title.match(/(\d+)(?:st|nd|rd|th)?\s+edition/i);
    if (editionMatch && editionMatch[1]) {
      return parseInt(editionMatch[1], 10);
    }
    
    return undefined;
  }

  private static extractEditionDate(olBook: OpenLibraryBook): Date | undefined {
    if (!olBook.publish_date) {
      return undefined;
    }
    
    try {
      // Handle various date formats
      const dateStr = olBook.publish_date.trim();
      
      // Try parsing as full date first
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try parsing as year only
      const yearMatch = dateStr.match(/(\d{4})/);
      if (yearMatch && yearMatch[1]) {
        date = new Date(parseInt(yearMatch[1], 10), 0, 1); // January 1st of that year
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn(`Failed to parse edition date: ${olBook.publish_date}`, error);
      return undefined;
    }
  }

  private static extractLanguage(olBook: OpenLibraryBook): string | undefined {
    if (!olBook.languages || olBook.languages.length === 0) {
      return undefined;
    }
    
    // Open Library language format: { key: "/languages/eng" }
    const language = olBook.languages[0];
    if (!language) {
        return undefined;
    }
    
    const langKey = language.key;
    const langCode = langKey.split('/').pop();
    
    // Convert common language codes to readable names
    const languageMap: Record<string, string> = {
      'eng': 'English',
      'spa': 'Spanish',
      'fre': 'French',
      'ger': 'German',
      'ita': 'Italian',
      'por': 'Portuguese',
      'rus': 'Russian',
      'jpn': 'Japanese',
      'chi': 'Chinese',
      'ara': 'Arabic',
    };
    
    return langCode ? languageMap[langCode] || langCode : undefined;
  }

  private static extractCoverUrls(olBook: OpenLibraryBook): { small?: string | undefined; medium?: string | undefined; large?: string | undefined } | undefined {
    if (!olBook.cover) {
      return undefined;
    }
    
    return {
      small: olBook.cover.small || undefined,
      medium: olBook.cover.medium || undefined,
      large: olBook.cover.large || undefined,
    };
  }
}