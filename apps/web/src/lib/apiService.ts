import { ENDPOINTS } from './constants';
import { encryptData } from './crypto';
export const globalLoader = {
    start: () => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('apiLoadStart'));
    },
    stop: () => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('apiLoadEnd'));
    }
};

class ApiService {
    private getHeaders() {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private async handleResponse(response: Response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        return data;
    }

    async post(url: string, body: any) {
        globalLoader.start();
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(body),
            });
            return await this.handleResponse(response);
        } finally {
            globalLoader.stop();
        }
    }

    async get(url: string) {
        globalLoader.start();
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            return await this.handleResponse(response);
        } finally {
            globalLoader.stop();
        }
    }

    async patch(url: string, body: any) {
        globalLoader.start();
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(body),
            });
            return await this.handleResponse(response);
        } finally {
            globalLoader.stop();
        }
    }

    async delete(url: string) {
        globalLoader.start();
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });
            if (response.status === 204) return { status: 'success' };
            return await this.handleResponse(response);
        } finally {
            globalLoader.stop();
        }
    }

    // Auth specific
    async login(credentials: any) {
        const encryptedData = {
            ...credentials,
            username: encryptData(credentials.username),
            password: encryptData(credentials.password),
        };
        return this.post(ENDPOINTS.AUTH.LOGIN, encryptedData);
    }

    async register(data: any) {
        const encryptedData = {
            ...data,
            username: encryptData(data.username),
            password: encryptData(data.password),
        };
        return this.post(ENDPOINTS.AUTH.REGISTER, encryptedData);
    }

    async logout() {
        return this.get(ENDPOINTS.AUTH.LOGOUT);
    }

    // Tenant specific
    async getTenants() {
        return this.get(ENDPOINTS.TENANTS.BASE);
    }

    async getTenant(id: string) {
        return this.get(`${ENDPOINTS.TENANTS.BASE}/${id}`);
    }

    async createTenant(data: any) {
        return this.post(ENDPOINTS.TENANTS.BASE, data);
    }

    async updateTenant(id: string, data: any) {
        return this.patch(`${ENDPOINTS.TENANTS.BASE}/${id}`, data);
    }

    async deleteTenant(id: string) {
        return this.delete(`${ENDPOINTS.TENANTS.BASE}/${id}`);
    }

    async getTenantUsers(id: string, page: number = 1) {
        return this.get(`${ENDPOINTS.TENANTS.BASE}/${id}/users?page=${page}`);
    }

    async createTenantUser(id: string, userData: any) {
        return this.post(`${ENDPOINTS.TENANTS.BASE}/${id}/users`, userData);
    }

    async updatePersonnelPassword(tenantId: string, userId: string, passwordData: any) {
        return this.patch(`${ENDPOINTS.TENANTS.BASE}/${tenantId}/users/${userId}/password`, passwordData);
    }

    // Instructor management (for TENANT users)
    async getMyInstructors(page: number = 1) {
        return this.get(`${ENDPOINTS.TENANTS.BASE}/my/instructors?page=${page}`);
    }

    async createInstructor(data: any) {
        return this.post(`${ENDPOINTS.TENANTS.BASE}/my/instructors`, data);
    }

    async updateInstructorPassword(userId: string, passwordData: any) {
        return this.patch(`${ENDPOINTS.TENANTS.BASE}/my/instructors/${userId}/password`, passwordData);
    }
}

export const apiService = new ApiService();
