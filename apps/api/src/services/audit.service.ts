import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogData {
    action: string;
    entity: string;
    userId: string;
    tenantId: string;
    beforeState?: any;
    afterState?: any;
    correlationId?: string;
}

export class AuditService {
    static async log(data: AuditLogData) {
        try {
            await prisma.auditLog.create({
                data: {
                    action: data.action,
                    entity: data.entity,
                    userId: data.userId,
                    tenantId: data.tenantId,
                    beforeState: data.beforeState ? JSON.parse(JSON.stringify(data.beforeState)) : null,
                    afterState: data.afterState ? JSON.parse(JSON.stringify(data.afterState)) : null,
                    correlationId: data.correlationId || null
                }
            });
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // We intentionally swallow the error so an audit failure doesn't crash the main transaction
        }
    }
}
