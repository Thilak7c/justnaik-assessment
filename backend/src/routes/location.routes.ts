import { Router } from 'express';
import { currentUserId, requireAuth } from '../middleware/requireAuth';
import { parseOrThrow } from '../middleware/validate';
import { idParamSchema, listQuerySchema, locationInputSchema } from '../schemas/location.schema';
import * as locationService from '../services/location.service';

export const locationRouter = Router();
locationRouter.use(requireAuth); // every location endpoint requires a valid JWT

// GET /api/locations?q=klcc&page=1&limit=10  -> server-side search + pagination
locationRouter.get('/', async (req, res) => {
  const query = parseOrThrow(listQuerySchema, req.query, 'Invalid search parameters');
  res.json(await locationService.listLocations(currentUserId(req), query));
});

locationRouter.get('/:id', async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params, 'Invalid location id');
  res.json(await locationService.getLocation(currentUserId(req), id));
});

locationRouter.post('/', async (req, res) => {
  const input = parseOrThrow(locationInputSchema, req.body);
  res.status(201).json(await locationService.createLocation(currentUserId(req), input));
});

locationRouter.put('/:id', async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params, 'Invalid location id');
  const input = parseOrThrow(locationInputSchema, req.body);
  res.json(await locationService.updateLocation(currentUserId(req), id, input));
});

locationRouter.delete('/:id', async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params, 'Invalid location id');
  await locationService.deleteLocation(currentUserId(req), id);
  res.status(204).end();
});
