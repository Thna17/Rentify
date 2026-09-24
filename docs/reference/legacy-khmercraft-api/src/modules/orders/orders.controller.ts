import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import * as ordersService from './orders.service';
import {
  CreateOrderInput,
  TransitionOrderInput,
  listOrdersQuerySchema,
} from './orders.validation';

export const create = async (request: Request, response: Response) => {
  const order = await ordersService.createOrder(
    request.auth!.user,
    request.body as CreateOrderInput,
  );

  response.status(201).json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    message: 'Order placed successfully.',
    order,
  });
};

const parseListQuery = (request: Request) => {
  const parsed = listOrdersQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(422, 'Invalid pagination', 'VALIDATION_ERROR');
  }
  return parsed.data;
};

export const listMine = async (request: Request, response: Response) => {
  const { page, limit } = parseListQuery(request);
  response.json(
    await ordersService.listMyOrders(request.auth!.userId, page, limit),
  );
};

/** The seller order desk: orders containing at least one of my products. */
export const listForSeller = async (request: Request, response: Response) => {
  const { page, limit, status } = parseListQuery(request);
  response.json(
    await ordersService.listSellerOrders(
      request.auth!.userId,
      page,
      limit,
      status,
    ),
  );
};

export const detail = async (request: Request, response: Response) => {
  response.json(
    await ordersService.getOrder(request.auth!.userId, param(request, 'id')),
  );
};

/**
 * One endpoint for every status change.
 *
 * The actor is taken from the authenticated role, never from the body, so a
 * buyer cannot claim to be a seller to accept their own order.
 */
export const transition = async (request: Request, response: Response) => {
  const { status, note } = request.body as TransitionOrderInput;
  const role = request.auth!.role;
  const actor = role === 'ADMIN' ? 'ADMIN' : role === 'SELLER' ? 'SELLER' : 'BUYER';

  response.json(
    await ordersService.transitionOrder(
      actor,
      request.auth!.userId,
      param(request, 'id'),
      status,
      note,
    ),
  );
};
