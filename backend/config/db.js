import mongoose from 'mongoose'

export async function connectDb() {
  const uri = process.env.MONGODB_URI
  const useMongo = String(process.env.USE_MONGODB || 'false').toLowerCase() === 'true'

  if (!useMongo || !uri) {
    console.log('MongoDB disabled for local demo. Using built-in starter data.')
    return false
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    console.log('MongoDB connected')
    return true
  } catch (error) {
    console.warn(`MongoDB unavailable: ${error.message}`)
    return false
  }
}
