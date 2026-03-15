import { Router } from "express";
import {createMatch, getmatches}  from "../controller/match.controller.js";

export const matchRouter = Router();

matchRouter.route('/').get(getmatches)

matchRouter.route('/').post(createMatch)