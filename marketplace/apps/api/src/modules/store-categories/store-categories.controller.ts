import { Request, Response } from 'express';
import { param } from '../../utils/request-params';
import * as service from './store-categories.service';
import {
  CreateStoreCategoryInput,
  CreateSubcategoryInput,
  ReorderInput,
  UpdateStoreCategoryInput,
  UpdateSubcategoryInput,
} from './store-categories.validation';

export const listPublic = async (request: Request, response: Response) => {
  response.json({ categories: await service.listPublicCategories(param(request, 'storeId')) });
};

export const listOwner = async (request: Request, response: Response) => {
  response.json({
    categories: await service.listOwnerCategories(param(request, 'storeId'), request.auth!.userId),
  });
};

export const create = async (request: Request, response: Response) => {
  const category = await service.createCategory(
    param(request, 'storeId'),
    request.auth!.userId,
    request.body as CreateStoreCategoryInput,
  );
  response.status(201).json(category);
};

export const update = async (request: Request, response: Response) => {
  const category = await service.updateCategory(
    param(request, 'storeId'),
    request.auth!.userId,
    param(request, 'categoryId'),
    request.body as UpdateStoreCategoryInput,
  );
  response.json(category);
};

export const reorder = async (request: Request, response: Response) => {
  const categories = await service.reorderCategories(
    param(request, 'storeId'),
    request.auth!.userId,
    request.body as ReorderInput,
  );
  response.json({ categories });
};

export const remove = async (request: Request, response: Response) => {
  await service.deleteCategory(param(request, 'storeId'), request.auth!.userId, param(request, 'categoryId'));
  response.status(204).send();
};

export const addSubcategory = async (request: Request, response: Response) => {
  const category = await service.addSubcategory(
    param(request, 'storeId'),
    request.auth!.userId,
    param(request, 'categoryId'),
    request.body as CreateSubcategoryInput,
  );
  response.status(201).json(category);
};

export const updateSubcategory = async (request: Request, response: Response) => {
  const category = await service.updateSubcategory(
    param(request, 'storeId'),
    request.auth!.userId,
    param(request, 'categoryId'),
    param(request, 'subcategoryId'),
    request.body as UpdateSubcategoryInput,
  );
  response.json(category);
};

export const reorderSubcategories = async (request: Request, response: Response) => {
  const category = await service.reorderSubcategories(
    param(request, 'storeId'),
    request.auth!.userId,
    param(request, 'categoryId'),
    request.body as ReorderInput,
  );
  response.json(category);
};

export const removeSubcategory = async (request: Request, response: Response) => {
  const category = await service.deleteSubcategory(
    param(request, 'storeId'),
    request.auth!.userId,
    param(request, 'categoryId'),
    param(request, 'subcategoryId'),
  );
  response.json(category);
};
