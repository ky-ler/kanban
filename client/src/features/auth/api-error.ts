interface ApiErrorOptions {
  status: number;
  code?: string;
  title?: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  title?: string;
  fieldErrors?: Record<string, string>;

  constructor({ status, code, title, message, fieldErrors }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.title = title;
    this.fieldErrors = fieldErrors;
  }
}
