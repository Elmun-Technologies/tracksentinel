import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://tracksentinel:tracksentinel_dev@localhost:5432/tracksentinel'

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // silence notices
})

export const db = drizzle(client, { schema })

export type Database = typeof db
