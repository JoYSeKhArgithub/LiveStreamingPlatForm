import { integer } from 'drizzle-orm/gel-core';
import { json, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
export const matchStatus = pgEnum('match_status',['schedule','live','finished'])

export const matches = pgTable('matches',{
    id: serial('id').primaryKey(),
    sport: text('sport').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    status:   matchStatus('status').notNull().default('schedule'),
    startTime: timestamp('start_time'),
    endTime: timestamp('end_time'),
    homeScore: integer('home_score').notNull().default(0),
    awayScore: integer('away_score').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow()
})

export const commentary = pgTable('commentry',{
    id: serial('id').primaryKey(),
    matchId: integer('match_id').notNull().references(()=> matches.id),
    minute: integer('minute'),
    sequance: integer('sequance'),
    period: text('period'),
    eventType: text('event_type'),
    actor: text('actor'),
    team: text('team'),
    message: text('message').notNull(),
    metadata: json('metadata'),
    tags: text('tags').array(),
    createdAt: timestamp('created_at').notNull().defaultNow() 
})