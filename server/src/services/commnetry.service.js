import { desc, eq } from "drizzle-orm";
import { db } from "../db/db.js"
import { commentary } from "../db/schema.js";

const createCommtery = async(data,parsed)=>{
    const { minutes, ...rest} = data
    const [commentaryRes] = await db.insert(commentary).values({
        matchId: parsed.id,
        minute: minutes,
        ...rest
    }).returning();
    return commentaryRes;
}


const getCommentry = async(limit,data)=>{
    const {id:matchId} = data;
    const dataRes = await db.select().from(commentary).where(eq(commentary.matchId,matchId)).orderBy(desc(commentary.createdAt)).limit(limit);
    return dataRes;
}

export default {createCommtery,getCommentry}