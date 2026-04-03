import { desc } from "drizzle-orm";
import { db } from "../db/db.js";
import {matches} from '../db/schema.js'
import { getMatchStatus } from "../utils/matchStatus.js";

const createMatch = async (data) => {
    const { startTime, endTime, homeScore, awayScore } = data;

    const [event] = await db.insert(matches).values({
        ...data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: getMatchStatus(startTime, endTime)
    }).returning();
    
    return event;
};


const getMatch = async(limit)=>{
    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
    return data;
}

export default {createMatch,getMatch}