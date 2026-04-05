import { Router } from "express";
import { createCommentry, getCommentry } from "../controller/commnetry.controller.js";

export const commenTryRoute = Router();

commenTryRoute.route('/:id').post(createCommentry)
commenTryRoute.route('/:id').get(getCommentry)


