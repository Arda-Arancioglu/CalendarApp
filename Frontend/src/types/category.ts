/** Response of every /api/categories endpoint. */
export interface CategoryResponseDTO {
  categoryId: number;
  name: string;
  /** Hex color like "#6366F1" (validated by the server with ^#[A-Fa-f0-9]{6}$). */
  color: string;
}

/** Body of POST and PUT /api/categories. */
export interface CategoryRequestDTO {
  name: string;
  color: string;
}
