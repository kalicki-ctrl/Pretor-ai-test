
import { createClient } from 'redis';
import { createHash } from 'crypto';

let client: any = null;
let isRedisAvailable = false;

const initializeRedis = async () => {
    // Skip Redis initialization if no Redis URL is provided
    if (!process.env.REDIS_URL) {
        console.log('Redis URL não configurada, usando modo sem cache');
        isRedisAvailable = false;
        return;
    }

    try {
        client = createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 5000,
            }
        });

        client.on('error', (err: any) => {
            console.log('Redis Client Error', err);
            isRedisAvailable = false;
        });

        await client.connect();
        isRedisAvailable = true;
        console.log('Conectado ao Redis');
    } catch (error) {
        console.log('Erro ao conectar ao Redis, continuando sem cache:', error);
        isRedisAvailable = false;
        client = null;
    }
};

export const connectRedis = async () => {
    await initializeRedis();
};

export const setCache = async (key: string, value: any, ttl: number = 3600) => {
    if (!isRedisAvailable || !client) {
        return;
    }

    try {
        await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
        console.log('Erro ao definir cache:', error);
        isRedisAvailable = false;
    }
};

export const getCache = async (key: string) => {
    if (!isRedisAvailable || !client) {
        return null;
    }

    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.log('Erro ao obter cache:', error);
        isRedisAvailable = false;
        return null;
    }
};

export const closeRedis = async () => {
    if (!client) {
        return;
    }

    try {
        await client.quit();
        console.log('Redis desconectado');
    } catch (error) {
        console.log('Erro ao desconectar Redis:', error);
    }
};

// Generate a non-reversible cache key using SHA-256 hash
export const generateCacheKey = (prompt: string, aiWeights?: Record<string, number>): string => {
    const promptHash = createHash('sha256').update(prompt).digest('hex').slice(0, 32);
    const weightsString = aiWeights ? JSON.stringify(aiWeights) : '';
    const weightsHash = weightsString ? createHash('sha256').update(weightsString).digest('hex').slice(0, 16) : '';
    return `analysis:${promptHash}:${weightsHash}`;
};
