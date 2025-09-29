/**
 * Algorithm Parameters API
 * 
 * Endpoints for managing trading algorithm parameters
 */

import { Logger } from '../lib/utils/Logger.js';
import { DatabaseService } from '../lib/services/DatabaseService.js';

const logger = new Logger('ParametersAPI');

export async function handler(req, res) {
    const dbService = new DatabaseService();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { action } = req.query;
        
        switch (req.method) {
            case 'GET':
                if (action === 'active') {
                    // Get currently active parameters
                    const activeParams = await dbService.getActiveParameters();
                    return res.status(200).json({
                        success: true,
                        data: activeParams
                    });
                } else if (action === 'history') {
                    // Get parameter history
                    const { parameterId } = req.query;
                    const history = await dbService.getParameterHistory(parameterId);
                    return res.status(200).json({
                        success: true,
                        data: history
                    });
                } else {
                    // Get all saved parameters
                    const { limit = 50, offset = 0 } = req.query;
                    const parameters = await dbService.getAllParameters(
                        parseInt(limit), 
                        parseInt(offset)
                    );
                    return res.status(200).json({
                        success: true,
                        data: parameters
                    });
                }
                
            case 'POST':
                // Save new parameters from backtest
                const { parameters, performance, name, description } = req.body;
                
                if (!parameters || !name) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required fields: parameters and name'
                    });
                }
                
                const savedParams = await dbService.saveAlgorithmParameters(
                    parameters,
                    performance || {},
                    name,
                    description
                );
                
                return res.status(201).json({
                    success: true,
                    data: savedParams
                });
                
            case 'PUT':
                // Activate a parameter set
                const { parameterId } = req.body;
                
                if (!parameterId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required field: parameterId'
                    });
                }
                
                const result = await dbService.activateParameters(parameterId);
                
                return res.status(200).json({
                    success: true,
                    data: { activated: result }
                });
                
            default:
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed'
                });
        }
        
    } catch (error) {
        logger.error('Parameters API error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export default handler;
