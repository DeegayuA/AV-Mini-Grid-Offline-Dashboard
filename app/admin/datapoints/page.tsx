'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // For navigation if needed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Edit3, Trash2, AlertTriangle, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { DataPointDefinitionDB } from '@/lib/duckdbClient'; // DB type
// import { DataPointDefinitionFormModal } from '@/components/admin/DataPointDefinitionFormModal'; // Placeholder for future modal

// Minimal UI-specific type, can be expanded
interface UIDataPointDefinition extends DataPointDefinitionDB {
    // Add any UI specific fields if needed, e.g., transformed icon component
}

const transformDbToUi = (dbDef: DataPointDefinitionDB): UIDataPointDefinition => {
    // For now, direct mapping. Later, icon string to component if displaying icons here.
    return { ...dbDef };
};

export default function ManageDataPointsPage() {
    const router = useRouter();
    const [dataPoints, setDataPoints] = useState<UIDataPointDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // const [isModalOpen, setIsModalOpen] = useState(false);
    // const [editingDataPoint, setEditingDataPoint] = useState<UIDataPointDefinition | null>(null);

    const fetchDataPoints = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/datapoints');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Failed to fetch data points' }));
                throw new Error(errData.message);
            }
            const dbDefs = await response.json() as DataPointDefinitionDB[];
            setDataPoints(dbDefs.map(transformDbToUi));
        } catch (err) {
            console.error("Error fetching data points:", err);
            setError((err as Error).message);
            toast.error("Failed to load data points", { description: (err as Error).message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDataPoints();
    }, [fetchDataPoints]);

    const handleAddNew = () => {
        // setEditingDataPoint(null);
        // setIsModalOpen(true);
        toast.info("Add New Data Point: Functionality to be implemented.");
    };

    const handleEdit = (dp: UIDataPointDefinition) => {
        // setEditingDataPoint(dp);
        // setIsModalOpen(true);
        toast.info(`Edit Data Point ${dp.id}: Functionality to be implemented.`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(`Are you sure you want to delete data point ${id}? This action cannot be undone.`)) {
            return;
        }
        try {
            const response = await fetch(`/api/datapoints/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                 const errData = await response.json().catch(() => ({ message: 'Failed to delete data point' }));
                throw new Error(errData.message || `Failed to delete. Status: ${response.status}`);
            }
            toast.success(`Data point ${id} deleted successfully.`);
            fetchDataPoints(); // Refresh list
        } catch (err) {
            console.error(`Error deleting data point ${id}:`, err);
            toast.error("Delete failed", { description: (err as Error).message });
        }
    };

    // const handleModalSave = () => {
    //     fetchDataPoints(); // Refresh list after save
    // };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-lg">Loading Data Point Definitions...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-600">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p className="text-xl mb-2">Error loading data points:</p>
                <p className="mb-4 text-sm">{error}</p>
                <Button onClick={fetchDataPoints} variant="outline">Try Again</Button>
                 <Button variant="link" onClick={() => router.push('/admin')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <Card className="shadow-xl">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center">
                                <Settings className="mr-3 h-7 w-7 text-primary" />
                                Manage Data Point Definitions
                            </CardTitle>
                            <CardDescription className="mt-1">
                                View, add, edit, or delete data point configurations used throughout the application.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => router.push('/admin')} size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
                            </Button>
                            <Button onClick={handleAddNew} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Definition
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {dataPoints.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No data point definitions found. Click "Add New" to get started.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>OPC UA Node ID</TableHead>
                                        <TableHead>Data Type</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dataPoints.map((dp) => (
                                        <TableRow key={dp.id}>
                                            <TableCell className="font-medium">{dp.id}</TableCell>
                                            <TableCell>{dp.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{dp.opcua_node_id}</TableCell>
                                            <TableCell>{dp.data_type}</TableCell>
                                            <TableCell>{dp.category || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(dp)} className="mr-2 hover:text-blue-600">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(dp.id)} className="hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/*
            {isModalOpen && (
                <DataPointDefinitionFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleModalSave}
                    initialData={editingDataPoint}
                />
            )}
            */}
        </div>
    );
}
