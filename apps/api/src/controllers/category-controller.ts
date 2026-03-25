import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CategoryService } from "@/services/category-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class CategoryController {
  public constructor(private readonly categoryService: CategoryService) {}

  public async listCategories(
    context: Context<AppBindings>,
    query: Parameters<CategoryService["listCategories"]>[0],
    requesterRole?: UserRole | undefined
  ): Promise<Response> {
    const categories = await this.categoryService.listCategories(query, requesterRole);

    return success(context, categories);
  }

  public async getCategoryById(context: Context<AppBindings>, id: string): Promise<Response> {
    const category = await this.categoryService.getCategoryById(id);

    return success(context, category);
  }

  public async getPublicCategoryBySlug(context: Context<AppBindings>, slug: string): Promise<Response> {
    const category = await this.categoryService.getPublicCategoryBySlug(slug);

    return success(context, category);
  }

  public async createCategory(
    context: Context<AppBindings>,
    input: Parameters<CategoryService["createCategory"]>[0]
  ): Promise<Response> {
    const category = await this.categoryService.createCategory(input);

    return success(context, category, 201, "Category created successfully");
  }

  public async updateCategory(
    context: Context<AppBindings>,
    id: string,
    input: Parameters<CategoryService["updateCategory"]>[1]
  ): Promise<Response> {
    const category = await this.categoryService.updateCategory(id, input);

    return success(context, category, 200, "Category updated successfully");
  }

  public async deleteCategory(context: Context<AppBindings>, id: string): Promise<Response> {
    await this.categoryService.deleteCategory(id);

    return success(context, { id }, 200, "Category deleted successfully");
  }

  public async reorderCategories(
    context: Context<AppBindings>,
    input: Parameters<CategoryService["reorderCategories"]>[0]
  ): Promise<Response> {
    const categories = await this.categoryService.reorderCategories(input);

    return success(context, categories, 200, "Category order updated successfully");
  }
}
