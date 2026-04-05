
import commnetryService from "../services/commnetry.service.js";
import { createCommentrySchema, listCommentryQuerySchema } from "../validation/commentry.js";
import { matchIdParamSchema } from "../validation/matches.js";
export const createCommentry = async(req,res)=>{
        const parsed = matchIdParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                error: parsed.error.flatten()
            });
        }
    const bodyResult = createCommentrySchema.safeParse(req.body);
    if (!bodyResult.success) {
        return res.status(400).json({
            error: parsed.error.flatten()
        });
    }
    try {
        const response = await commnetryService.createCommtery(bodyResult.data, parsed.data);
        if (res.app.locals.broadCastCommnetry){
            res.app.locals.broadCastCommnetry(response?.matchId,response)
        }
       return res.status(201).json({
        success: "commnetry created successfully",
        data: response
       })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}

const MAX_LIMIT = 100
export const getCommentry = async(req,res)=>{
    const matchId = matchIdParamSchema.safeParse(req.params);
    if(!matchId.success){
        return res.status(400).json({
            error: "Invalid query",
            details: JSON.stringify(parsed.error)
        })
    }
    const parsed = listCommentryQuerySchema.safeParse(req.query);
    console.log(parsed)
    if(!parsed.success){
        return res.status(400).json({
            error: "Invalid query",
            details: JSON.stringify(parsed.error)
        })
    }
    
    const limit = Math.min(50,MAX_LIMIT) 
    try {
        const response = await commnetryService.getCommentry(limit, matchId.data);
        return res.status(200).json({
            success: true,
            data: response
        })
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}