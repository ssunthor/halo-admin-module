export const docsService = {
    fetchDocsConfig: async () => {
        const response = await fetch('/api/docs/config');
        if (!response.ok) throw new Error('Failed to fetch documentation configuration');
        return response.json();
    },
    fetchHaloDocsTree: async () => {
        const response = await fetch('/api/docs/halo-tree');
        if (!response.ok) throw new Error('Failed to fetch halo documentation tree');
        return response.json();
    },
    fetchDocContent: async (docKey) => {
        const response = await fetch(`/api/docs/content/${docKey}`);
        if (!response.ok) throw new Error(`Failed to fetch document: ${docKey}`);
        return response.text();
    },
    fetchChangelog: async () => {
        const response = await fetch(`/api/docs/changelog`);
        if (!response.ok) throw new Error('Failed to fetch changelog');
        return response.json();
    },
    getDownloadUrl: (docKey) => {
        return `/api/docs/download/${docKey}`;
    },
    getAllChangelogsDownloadUrl: () => {
        return `/api/docs/download/changelogs/all`;
    }
};