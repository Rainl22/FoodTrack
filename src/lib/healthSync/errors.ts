export class DriveAuthError extends Error {
  constructor() {
    super('Drive authentication failed — token expired or access was revoked');
    this.name = 'DriveAuthError';
  }
}

export class DriveDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveDownloadError';
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceError';
  }
}
