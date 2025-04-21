import express from 'express';
import * as swapController from '../controllers/swap.controller.js';

const router = express.Router();

// Create a new swap
router.post('/', swapController.createSwap);

// Set a swap as ready
router.post('/:swapId/ready', swapController.setSwapReady);

// Claim a swap
router.post('/:swapId/claim', swapController.claimSwap);

// Refund a swap
router.post('/:swapId/refund', swapController.refundSwap);

// Get a swap by ID
router.get('/:swapId', swapController.getSwap);

// Get all swaps
router.get('/', swapController.getAllSwaps);

export default router;
