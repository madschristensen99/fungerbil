import { Request, Response } from 'express';
import swapService from '../services/swap.service.js';
import logger from '../utils/logger.js';
import { ApiResponse, CreateSwapRequest, ClaimSwapRequest, RefundSwapRequest } from '../types/index.js';

/**
 * Create a new swap
 * @param req The request object
 * @param res The response object
 */
export async function createSwap(req: Request, res: Response): Promise<void> {
  try {
    const request = req.body as CreateSwapRequest;
    // Use private key from headers or try to use the default one from environment variables
    const privateKey = req.headers['x-private-key'] as string || process.env.DEFAULT_PRIVATE_KEY;
    
    if (!request.direction) {
      res.status(400).json({
        success: false,
        error: 'Swap direction is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    if (request.direction === 'USDC_TO_XMR') {
      if (!privateKey) {
        res.status(400).json({
          success: false,
          error: 'Private key is required for USDC to XMR swaps',
          timestamp: Date.now()
        } as ApiResponse<null>);
        return;
      }
      
      const swap = await swapService.createUsdcToXmrSwap(request, privateKey);
      
      res.status(201).json({
        success: true,
        data: swap,
        timestamp: Date.now()
      } as ApiResponse<any>);
    } else if (request.direction === 'XMR_TO_USDC') {
      const { swap, xmrWallet } = await swapService.createXmrToUsdcSwap(request);
      
      res.status(201).json({
        success: true,
        data: {
          swap,
          xmrWallet: {
            address: xmrWallet.address,
            seed: xmrWallet.seed
          }
        },
        timestamp: Date.now()
      } as ApiResponse<any>);
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid swap direction',
        timestamp: Date.now()
      } as ApiResponse<null>);
    }
  } catch (error: any) {
    logger.error(`Error creating swap: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}

/**
 * Set a swap as ready
 * @param req The request object
 * @param res The response object
 */
export async function setSwapReady(req: Request, res: Response): Promise<void> {
  try {
    const { swapId } = req.params;
    // Use private key from headers or try to use the default one from environment variables
    const privateKey = req.headers['x-private-key'] as string || process.env.DEFAULT_PRIVATE_KEY;
    
    if (!privateKey) {
      res.status(400).json({
        success: false,
        error: 'Private key is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    const swap = await swapService.setSwapReady(swapId, privateKey);
    
    res.status(200).json({
      success: true,
      data: swap,
      timestamp: Date.now()
    } as ApiResponse<any>);
  } catch (error: any) {
    logger.error(`Error setting swap as ready: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}

/**
 * Claim a swap
 * @param req The request object
 * @param res The response object
 */
export async function claimSwap(req: Request, res: Response): Promise<void> {
  try {
    const { swapId } = req.params;
    const request = req.body as ClaimSwapRequest;
    // Use private key from headers or try to use the default one from environment variables
    const privateKey = req.headers['x-private-key'] as string || process.env.DEFAULT_PRIVATE_KEY;
    
    if (!privateKey) {
      res.status(400).json({
        success: false,
        error: 'Private key is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    if (!request.secret) {
      res.status(400).json({
        success: false,
        error: 'Secret is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    const swap = await swapService.claimSwap(swapId, request.secret, privateKey);
    
    res.status(200).json({
      success: true,
      data: swap,
      timestamp: Date.now()
    } as ApiResponse<any>);
  } catch (error: any) {
    logger.error(`Error claiming swap: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}

/**
 * Refund a swap
 * @param req The request object
 * @param res The response object
 */
export async function refundSwap(req: Request, res: Response): Promise<void> {
  try {
    const { swapId } = req.params;
    const request = req.body as RefundSwapRequest;
    // Use private key from headers or try to use the default one from environment variables
    const privateKey = req.headers['x-private-key'] as string || process.env.DEFAULT_PRIVATE_KEY;
    
    if (!privateKey) {
      res.status(400).json({
        success: false,
        error: 'Private key is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    if (!request.secret) {
      res.status(400).json({
        success: false,
        error: 'Secret is required',
        timestamp: Date.now()
      } as ApiResponse<null>);
      return;
    }
    
    const swap = await swapService.refundSwap(swapId, request.secret, privateKey);
    
    res.status(200).json({
      success: true,
      data: swap,
      timestamp: Date.now()
    } as ApiResponse<any>);
  } catch (error: any) {
    logger.error(`Error refunding swap: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}

/**
 * Get a swap by ID
 * @param req The request object
 * @param res The response object
 */
export async function getSwap(req: Request, res: Response): Promise<void> {
  try {
    const { swapId } = req.params;
    
    const swap = await swapService.getSwap(swapId);
    
    res.status(200).json({
      success: true,
      data: swap,
      timestamp: Date.now()
    } as ApiResponse<any>);
  } catch (error: any) {
    logger.error(`Error getting swap: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}

/**
 * Get all swaps
 * @param req The request object
 * @param res The response object
 */
export async function getAllSwaps(req: Request, res: Response): Promise<void> {
  try {
    const swaps = await swapService.getAllSwaps();
    
    res.status(200).json({
      success: true,
      data: swaps,
      timestamp: Date.now()
    } as ApiResponse<any>);
  } catch (error: any) {
    logger.error(`Error getting all swaps: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    } as ApiResponse<null>);
  }
}
