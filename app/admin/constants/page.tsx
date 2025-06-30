'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit3, AlertTriangle, UserCog, ArrowLeft } from 'lucide-react'; // UserCog or Settings for icon
import { toast } from 'sonner';
import { ConstantDB } from '@/lib/duckdbClient'; // DB type
// import { ConstantFormModal } from '@/components/admin/ConstantFormModal'; // Placeholder for future modal

export default function ManageConstantsPage() {
    const router = useRouter();
    const [constants, setConstants] = useState<ConstantDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // const [isModalOpen, setIsModalOpen] = useState(false);
    // const [editingConstant, setEditingConstant] = useState<ConstantDB | null>(null);

    const fetchConstants = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/constants');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Failed to fetch constants' }));
                throw new Error(errData.message);
            }
            const data = await response.json() as ConstantDB[];
            setConstants(data);
        } catch (err) {
            console.error("Error fetching constants:", err);
            setError((err as Error).message);
            toast.error("Failed to load constants", { description: (err as Error).message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConstants();
    }, [fetchConstants]);

    const handleEdit = (constant: ConstantDB) => {
        // setEditingConstant(constant);
        // setIsModalOpen(true);
        toast.info(`Edit Constant ${constant.key}: Functionality to be implemented via modal.`);
    };

    // Delete for constants is risky and usually not done via generic UI, but stubbed if needed.
    // const handleDelete = async (key: string) => { ... }

    // const handleModalSave = () => {
    //     fetchConstants(); // Refresh list after save
    // };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-lg">Loading Constants...</span></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-600">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p className="text-xl mb-2">Error loading constants:</p>
                <p className="mb-4 text-sm">{error}</p>
                <Button onClick={fetchConstants} variant="outline">Try Again</Button>
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
                                <UserCog className="mr-3 h-7 w-7 text-primary" />
                                Manage Application Constants
                            </CardTitle>
                            <CardDescription className="mt-1">
                                View and edit global application constants stored in the database.
                            </CardDescription>
                        </div>
                         <Button variant="outline" onClick={() => router.push('/admin')} size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {constants.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No constants found. These are typically seeded by a migration script.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">Key</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {constants.map((constant) => (
                                        <TableRow key={constant.key}>
                                            <TableCell className="font-medium font-mono text-xs">{constant.key}</TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate" title={String(constant.value)}>
                                                    {String(constant.value)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                 <div className="max-w-md truncate" title={constant.description || ''}>
                                                    {constant.description || <span className="text-muted-foreground italic">N/A</span>}
                                                 </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(constant)} className="hover:text-blue-600">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                {/* Delete button could be added here if needed */}
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
            {isModalOpen && editingConstant && (
                <ConstantFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleModalSave}
                    constantKey={editingConstant.key}
                    initialValue={editingConstant.value}
                    initialDescription={editingConstant.description || ''}
                />
            )}
            */}
        </div>
    );
}
