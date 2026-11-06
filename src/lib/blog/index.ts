// The one place that decides where blog content comes from.
// To move to a database or CMS: write another BlogSource and change this line.
import { fileSource } from "./file-source";

export const blog = fileSource;
export type { BlogSource, Post, PostSummary } from "./types";
