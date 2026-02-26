import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'

// #region agent log
try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_init`,timestamp:Date.now(),location:'lib/prisma.js:8',message:'Prisma initialization started',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,nodeEnv:process.env.NODE_ENV,databaseUrlPreview:process.env.DATABASE_URL?.substring(0,30)+'...'},sessionId:'debug-session',runId:'run1',hypothesisId:'A'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
// #endregion

const globalForPrisma = globalThis

// #region agent log
try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_adapter`,timestamp:Date.now(),location:'lib/prisma.js:14',message:'Creating PrismaPg adapter',data:{connectionStringLength:process.env.DATABASE_URL?.length||0,hasConnectionString:!!process.env.DATABASE_URL},sessionId:'debug-session',runId:'run1',hypothesisId:'B'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
// #endregion
let adapter
try {
  adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  // #region agent log
  try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_adapter_ok`,timestamp:Date.now(),location:'lib/prisma.js:20',message:'Adapter created successfully',data:{adapterType:adapter?.constructor?.name},sessionId:'debug-session',runId:'run1',hypothesisId:'B'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
  // #endregion
} catch (error) {
  // #region agent log
  try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_adapter_err`,timestamp:Date.now(),location:'lib/prisma.js:24',message:'Adapter creation failed',data:{error:error.message,errorStack:error.stack?.substring(0,200)},sessionId:'debug-session',runId:'run1',hypothesisId:'B'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
  // #endregion
  throw error
}

// #region agent log
try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_client`,timestamp:Date.now(),location:'lib/prisma.js:30',message:'Creating PrismaClient',data:{adapterType:adapter?.constructor?.name,hasGlobalPrisma:!!globalForPrisma.prisma},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
// #endregion

let prisma
try {
  prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
  // #region agent log
  try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_client_ok`,timestamp:Date.now(),location:'lib/prisma.js:36',message:'PrismaClient created successfully',data:{prismaType:prisma?.constructor?.name,isReused:!!globalForPrisma.prisma,hasAdapter:!!adapter},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
  // #endregion
} catch (error) {
  // #region agent log
  try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_client_err`,timestamp:Date.now(),location:'lib/prisma.js:40',message:'PrismaClient creation failed',data:{error:error.message,errorStack:error.stack?.substring(0,200)},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
  // #endregion
  throw error
}

// #region agent log
try{const logPath=join(process.cwd(),'.cursor','debug.log');const logData={id:`log_${Date.now()}_export`,timestamp:Date.now(),location:'lib/prisma.js:46',message:'Prisma export completed',data:{prismaType:prisma?.constructor?.name},sessionId:'debug-session',runId:'run1',hypothesisId:'D'};appendFileSync(logPath,JSON.stringify(logData)+'\n');}catch(e){}
// #endregion

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }

