export interface ProjectFixture {
  id: string;
  uploads: string[];
}

export interface Image {
  path: string;
  name: string;
  mimeType: string;
  size: number;
}
