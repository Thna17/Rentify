import { Request, Response } from 'express';
import { param } from '../../utils/request-params';
import * as cartService from './cart.service';
import { AddCartItemInput, UpdateCartItemInput } from './cart.validation';

/** `authenticate` guarantees request.auth on every route in this module. */
const userIdOf = (request: Request) => request.auth!.userId;

export const show = async (request: Request, response: Response) => {
  response.json(await cartService.getCart(userIdOf(request)));
};

export const addItem = async (request: Request, response: Response) => {
  const { productId, quantity } = request.body as AddCartItemInput;
  response
    .status(201)
    .json(await cartService.addItem(userIdOf(request), productId, quantity));
};

export const updateItem = async (request: Request, response: Response) => {
  const { quantity } = request.body as UpdateCartItemInput;
  response.json(
    await cartService.updateItem(
      userIdOf(request),
      param(request, 'itemId'),
      quantity,
    ),
  );
};

export const removeItem = async (request: Request, response: Response) => {
  response.json(
    await cartService.removeItem(userIdOf(request), param(request, 'itemId')),
  );
};

export const clear = async (request: Request, response: Response) => {
  response.json(await cartService.clearCart(userIdOf(request)));
};
