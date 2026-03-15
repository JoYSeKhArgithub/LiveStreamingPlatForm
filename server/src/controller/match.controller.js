import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js"
import matchService from '../services/match.service.js'
import { response } from "express";

export const createMatch = async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: parsed.error.flatten()
        });
    }

    try {
        const response = await matchService.createMatch(parsed.data);

        return res.status(201).json({
            data: response
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to create match",
            details: error.message
        });
    }
};

const MAX_LIMIT = 100;
export const getmatches = async(req,res)=>{
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if(!parsed.success){
        return res.status(400).json({
            error: "Invalid query",
            details: JSON.stringify(parsed.error)
        })
    }
    const limit = Math.min(parsed.data.limit??50,MAX_LIMIT) 
    try {
        const response = await matchService.getMatch(limit);
        res.status(200).json({
            response: response
        })
    } catch (error) {
        return response.status(500).json({
            error: "Failed to list matches"
        })
    }
}