import { ArtistData } from "@/pages/Index";

export interface JSONField {
  key: string;
  type: string;
  sampleValue: any;
  isSelected: boolean;
  path: string[];
  description?: string;
}

export interface JSONStructure {
  fields: JSONField[];
  totalRecords: number;
  estimatedSize: string;
  dataTypes: Record<string, number>;
}

export interface SQLConversionOptions {
  database: 'mysql' | 'postgresql' | 'sqlserver' | 'sqlite';
  tableName: string;
  includeCreateTable: boolean;
  includeInserts: boolean;
  batchSize: number;
}

export interface CombineOptions {
  mergeStrategy: 'append' | 'merge' | 'replace';
  conflictResolution: 'keep_first' | 'keep_last' | 'combine';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    duplicates: number;
  };
}

export class JSONManagementService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly CHUNK_SIZE = 1000; // Records per chunk

  /**
   * Analyze JSON structure and extract field information
   */
  static analyzeJSONStructure(data: any[]): JSONStructure {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        fields: [],
        totalRecords: 0,
        estimatedSize: '0 B',
        dataTypes: {}
      };
    }

    const fields: JSONField[] = [];
    const dataTypes: Record<string, number> = {};
    const fieldMap = new Map<string, JSONField>();

    // Analyze all records to get comprehensive field list
    data.forEach((record, index) => {
      if (index < 100) { // Analyze first 100 records for performance
        this.extractFields(record, [], fieldMap);
      }
    });

    // Convert map to array and add metadata
    fieldMap.forEach((field, key) => {
      fields.push({
        ...field,
        isSelected: true // Default to selected
      });
      
      dataTypes[field.type] = (dataTypes[field.type] || 0) + 1;
    });

    const estimatedSize = this.calculateSize(data);

    return {
      fields: fields.sort((a, b) => a.key.localeCompare(b.key)),
      totalRecords: data.length,
      estimatedSize,
      dataTypes
    };
  }

  /**
   * Recursively extract fields from nested objects
   */
  private static extractFields(obj: any, path: string[], fieldMap: Map<string, JSONField>) {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        this.extractFields(obj[0], [...path, '[]'], fieldMap);
      }
      return;
    }

    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const newPath = [...path, key];
        const fullKey = newPath.join('.');
        const value = obj[key];
        
        if (!fieldMap.has(fullKey)) {
          fieldMap.set(fullKey, {
            key: fullKey,
            type: this.getValueType(value),
            sampleValue: this.getSampleValue(value),
            isSelected: true,
            path: newPath,
            description: this.generateFieldDescription(key, value)
          });
        }

        if (typeof value === 'object' && value !== null) {
          this.extractFields(value, newPath, fieldMap);
        }
      });
    }
  }

  /**
   * Get value type string
   */
  private static getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Get sample value for display
   */
  private static getSampleValue(value: any): any {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    if (Array.isArray(value)) {
      return `Array[${value.length}]`;
    }
    if (typeof value === 'object' && value !== null) {
      return `Object{${Object.keys(value).length} keys}`;
    }
    return value;
  }

  /**
   * Generate field description
   */
  private static generateFieldDescription(key: string, value: any): string {
    const descriptions: Record<string, string> = {
      'artistName': 'Artist or band name',
      'musicBrainzArtistID': 'Unique MusicBrainz identifier',
      'mvids': 'Array of music videos',
      'status': 'Processing status (pending/processing/completed/error)',
      'error': 'Error message if processing failed',
      'strDescription': 'Video description text (often large)',
      'strMusicVid': 'Music video URL',
      'strTrackThumb': 'Track thumbnail image URL',
      'intDuration': 'Track duration in seconds'
    };

    if (descriptions[key]) {
      return descriptions[key];
    }

    if (typeof value === 'string' && value.startsWith('http')) {
      return 'URL or web link';
    }
    
    if (key.includes('ID') || key.includes('Id')) {
      return 'Unique identifier';
    }

    return '';
  }

  /**
   * Calculate estimated file size
   */
  static calculateSize(data: any): string {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Create modified JSON with selected fields only
   */
  static createModifiedJSON(data: any[], selectedFields: JSONField[]): any[] {
    // Only include paths where isSelected is true
    const selectedPaths = new Set(
      selectedFields
        .filter(f => f.isSelected)
        .map(f => f.key)
    );
    
    console.log('Service - All fields:', selectedFields.map(f => ({ key: f.key, isSelected: f.isSelected })));
    console.log('Service - Selected paths:', Array.from(selectedPaths));
    
    return data.map(record => {
      const filtered = this.filterObject(record, selectedPaths, []);
      console.log('Service - Original record:', record);
      console.log('Service - Filtered record:', filtered);
      return filtered;
    });
  }

  /**
   * Recursively filter object properties
   */
  private static filterObject(obj: any, selectedPaths: Set<string>, currentPath: string[]): any {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterObject(item, selectedPaths, [...currentPath, '[]']));
    }

    if (typeof obj === 'object') {
      const filtered: any = {};
      
      Object.keys(obj).forEach(key => {
        const newPath = [...currentPath, key];
        const pathKey = newPath.join('.');
        
        if (selectedPaths.has(pathKey)) {
          filtered[key] = obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Check if any nested paths are selected
          const hasNestedSelection = Array.from(selectedPaths).some(path => 
            path.startsWith(pathKey + '.')
          );
          
          if (hasNestedSelection) {
            const nestedResult = this.filterObject(obj[key], selectedPaths, newPath);
            if (Object.keys(nestedResult).length > 0 || Array.isArray(nestedResult)) {
              filtered[key] = nestedResult;
            }
          }
        }
      });
      
      return filtered;
    }

    return obj;
  }

  /**
   * Convert JSON to SQL format
   */
  static convertToSQL(data: any[], options: SQLConversionOptions): string {
    if (!data.length) return '';

    const sample = data[0];
    const columns = this.extractTableColumns(sample);
    
    let sql = '';

    // Add CREATE TABLE statement
    if (options.includeCreateTable) {
      sql += this.generateCreateTable(options.tableName, columns, options.database);
      sql += '\n\n';
    }

    // Add INSERT statements
    if (options.includeInserts) {
      sql += this.generateInserts(data, options.tableName, columns, options.database, options.batchSize);
    }

    return sql;
  }

  /**
   * Convert JSON to CSV format
   */
  static convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) return '';

    // Derive columns from sample record using existing extractor for consistency
    const sample = data[0];
    const columns = this.extractTableColumns(sample).map(c => c.name);

    const header = columns.map(col => this.sanitizeColumnName(col)).join(',');
    const rows = data.map(record => {
      const values = columns.map(col => {
        const v = this.getNestedValue(record, col);
        return this.csvEscape(v);
      });
      return values.join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Convert JSON to pretty-printed JSON string
   */
  static convertToJSON(data: any[]): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return '[]';
    }
  }

  /**
   * Escape a value for CSV
   */
  private static csvEscape(value: any): string {
    if (value === null || value === undefined) return '';
    let str: string;
    if (typeof value === 'object') {
      str = JSON.stringify(value);
    } else {
      str = String(value);
    }
    const needsQuotes = /[",\n\r]/.test(str) || str.includes(',');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  /**
   * Extract table columns from sample data
   */
  private static extractTableColumns(sample: any): Array<{name: string, type: string}> {
    const columns: Array<{name: string, type: string}> = [];
    
    const extractFromObject = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const columnName = prefix ? `${prefix}_${key}` : key;
        
        if (value === null || value === undefined) {
          columns.push({ name: columnName, type: 'TEXT' });
        } else if (typeof value === 'number') {
          columns.push({ name: columnName, type: Number.isInteger(value) ? 'INTEGER' : 'DECIMAL' });
        } else if (typeof value === 'boolean') {
          columns.push({ name: columnName, type: 'BOOLEAN' });
        } else if (Array.isArray(value)) {
          columns.push({ name: columnName, type: 'JSON' });
        } else if (typeof value === 'object') {
          extractFromObject(value, columnName);
        } else {
          columns.push({ name: columnName, type: 'TEXT' });
        }
      });
    };

    extractFromObject(sample);
    return columns;
  }

  /**
   * Generate CREATE TABLE statement
   */
  private static generateCreateTable(tableName: string, columns: Array<{name: string, type: string}>, database: string): string {
    const typeMapping: Record<string, Record<string, string>> = {
      mysql: {
        'TEXT': 'TEXT',
        'INTEGER': 'INT',
        'DECIMAL': 'DECIMAL(10,2)',
        'BOOLEAN': 'BOOLEAN',
        'JSON': 'JSON'
      },
      postgresql: {
        'TEXT': 'TEXT',
        'INTEGER': 'INTEGER',
        'DECIMAL': 'DECIMAL(10,2)',
        'BOOLEAN': 'BOOLEAN',
        'JSON': 'JSONB'
      },
      sqlserver: {
        'TEXT': 'NVARCHAR(MAX)',
        'INTEGER': 'INT',
        'DECIMAL': 'DECIMAL(10,2)',
        'BOOLEAN': 'BIT',
        'JSON': 'NVARCHAR(MAX)'
      },
      sqlite: {
        'TEXT': 'TEXT',
        'INTEGER': 'INTEGER',
        'DECIMAL': 'REAL',
        'BOOLEAN': 'INTEGER',
        'JSON': 'TEXT'
      }
    };

    const mapping = typeMapping[database];
    const columnDefs = columns.map(col => 
      `    ${this.sanitizeColumnName(col.name)} ${mapping[col.type] || 'TEXT'}`
    ).join(',\n');

    return `CREATE TABLE ${tableName} (\n${columnDefs}\n);`;
  }

  /**
   * Generate INSERT statements
   */
  private static generateInserts(data: any[], tableName: string, columns: Array<{name: string, type: string}>, database: string, batchSize: number): string {
    let sql = '';
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      if (database === 'mysql' || database === 'postgresql' || database === 'sqlite') {
        sql += this.generateBatchInsert(batch, tableName, columns, database);
      } else {
        // SQL Server - individual inserts
        batch.forEach(record => {
          sql += this.generateSingleInsert(record, tableName, columns);
        });
      }
      
      sql += '\n';
    }

    return sql;
  }

  /**
   * Generate batch INSERT statement
   */
  private static generateBatchInsert(batch: any[], tableName: string, columns: Array<{name: string, type: string}>, database: string): string {
    const columnNames = columns.map(col => this.sanitizeColumnName(col.name)).join(', ');
    const values = batch.map(record => {
      const valueList = columns.map(col => this.formatValue(this.getNestedValue(record, col.name), database)).join(', ');
      return `(${valueList})`;
    }).join(',\n    ');

    return `INSERT INTO ${tableName} (${columnNames}) VALUES\n    ${values};\n`;
  }

  /**
   * Generate single INSERT statement
   */
  private static generateSingleInsert(record: any, tableName: string, columns: Array<{name: string, type: string}>): string {
    const columnNames = columns.map(col => this.sanitizeColumnName(col.name)).join(', ');
    const values = columns.map(col => this.formatValue(this.getNestedValue(record, col.name), 'sqlserver')).join(', ');
    
    return `INSERT INTO ${tableName} (${columnNames}) VALUES (${values});\n`;
  }

  /**
   * Sanitize column names for SQL
   */
  private static sanitizeColumnName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('_');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Format value for SQL
   */
  private static formatValue(value: any, database: string): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Combine multiple JSON files
   */
  static combineJSONFiles(files: any[][], options: CombineOptions): any[] {
    if (files.length === 0) return [];
    if (files.length === 1) return files[0];

    let combined = files[0];

    for (let i = 1; i < files.length; i++) {
      combined = this.combineTwo(combined, files[i], options);
    }

    return combined;
  }

  /**
   * Combine two JSON arrays
   */
  private static combineTwo(first: any[], second: any[], options: CombineOptions): any[] {
    switch (options.mergeStrategy) {
      case 'append':
        return [...first, ...second];
      
      case 'merge':
        return this.mergeArrays(first, second, options.conflictResolution);
      
      case 'replace':
        return second;
      
      default:
        return [...first, ...second];
    }
  }

  /**
   * Merge arrays with conflict resolution
   */
  private static mergeArrays(first: any[], second: any[], conflictResolution: string): any[] {
    const merged = [...first];
    const firstKeys = new Set(first.map(item => this.getRecordKey(item)));

    second.forEach(item => {
      const key = this.getRecordKey(item);
      
      if (!firstKeys.has(key)) {
        merged.push(item);
      } else {
        const existingIndex = merged.findIndex(existing => this.getRecordKey(existing) === key);
        
        if (existingIndex >= 0) {
          switch (conflictResolution) {
            case 'keep_first':
              // Do nothing, keep existing
              break;
            case 'keep_last':
              merged[existingIndex] = item;
              break;
            case 'combine':
              merged[existingIndex] = { ...merged[existingIndex], ...item };
              break;
          }
        }
      }
    });

    return merged;
  }

  /**
   * Get unique key for record
   */
  private static getRecordKey(item: any): string {
    if (item.artistName) return item.artistName;
    if (item.id) return item.id;
    if (item.name) return item.name;
    return JSON.stringify(item);
  }

  /**
   * Deduplicate JSON data, keeping first occurrence of each unique record
   */
  static deduplicateJSON(data: any[]): {
    originalCount: number;
    deduplicatedCount: number;
    removedCount: number;
    duplicateKeys: string[];
    deduplicatedData: any[];
  } {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        originalCount: 0,
        deduplicatedCount: 0,
        removedCount: 0,
        duplicateKeys: [],
        deduplicatedData: []
      };
    }

    const seen = new Set<string>();
    const deduplicatedData: any[] = [];
    const duplicateKeys: Set<string> = new Set();
    let removedCount = 0;

    data.forEach((record, index) => {
      // Create a normalized string representation of the record for comparison
      const recordKey = this.createRecordKey(record);
      
      if (seen.has(recordKey)) {
        // Duplicate found
        removedCount++;
        // Track which fields are commonly used for identification
        this.identifyDuplicateKeys(record, duplicateKeys);
      } else {
        // Unique record, keep it
        seen.add(recordKey);
        deduplicatedData.push(record);
      }
    });

    return {
      originalCount: data.length,
      deduplicatedCount: deduplicatedData.length,
      removedCount,
      duplicateKeys: Array.from(duplicateKeys),
      deduplicatedData
    };
  }

  /**
   * Create a normalized key for record comparison
   */
  private static createRecordKey(record: any): string {
    if (record === null || record === undefined) {
      return 'null';
    }
    
    if (typeof record !== 'object') {
      return String(record);
    }

    // Create a sorted, normalized JSON string for consistent comparison
    const normalized = this.normalizeForComparison(record);
    return JSON.stringify(normalized);
  }

  /**
   * Normalize object for comparison (sort keys, handle arrays, etc.)
   */
  private static normalizeForComparison(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeForComparison(item));
    }
    
    if (typeof obj === 'object') {
      const normalized: any = {};
      Object.keys(obj).sort().forEach(key => {
        normalized[key] = this.normalizeForComparison(obj[key]);
      });
      return normalized;
    }
    
    return obj;
  }

  /**
   * Identify common fields that could be used for duplicate detection
   */
  private static identifyDuplicateKeys(record: any, duplicateKeys: Set<string>): void {
    if (typeof record !== 'object' || record === null) return;

    // Common identifier fields that are likely to be used for deduplication
    const commonIdFields = [
      'id', 'ID', '_id', 'objectId',
      'artistName', 'name', 'title',
      'musicBrainzArtistID', 'musicBrainzId', 'mbid',
      'email', 'username', 'userId',
      'url', 'link', 'href'
    ];

    Object.keys(record).forEach(key => {
      // Add fields that look like identifiers
      if (commonIdFields.some(idField => 
        key.toLowerCase().includes(idField.toLowerCase())
      )) {
        duplicateKeys.add(key);
      }
      
      // Add fields with URL-like values
      if (typeof record[key] === 'string' && record[key].startsWith('http')) {
        duplicateKeys.add(key);
      }
    });
  }

  /**
   * Validate JSON data
   */
  static validateJSON(data: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    const seen = new Set();
    let duplicates = 0;

    data.forEach((record, index) => {
      try {
        // Basic validation
        if (!record || typeof record !== 'object') {
          errors.push(`Record ${index + 1}: Invalid record type`);
          invalidRecords++;
          return;
        }

        // Check for required fields (for ArtistData)
        if (!record.artistName && !record.name && !record.title) {
          warnings.push(`Record ${index + 1}: Missing primary identifier (artistName/name/title)`);
        }

        // Check for duplicates
        const key = this.getRecordKey(record);
        if (seen.has(key)) {
          duplicates++;
          warnings.push(`Record ${index + 1}: Duplicate key "${key}"`);
        } else {
          seen.add(key);
        }

        validRecords++;

      } catch (error) {
        errors.push(`Record ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        invalidRecords++;
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecords: data.length,
        validRecords,
        invalidRecords,
        duplicates
      }
    };
  }

  /**
   * Download file with content
   */
  static downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Parse file size limit in bytes
   */
  static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Check if file size is acceptable
   */
  static isFileSizeAcceptable(file: File): boolean {
    return file.size <= this.MAX_FILE_SIZE;
  }
}
