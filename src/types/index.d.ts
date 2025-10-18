export type EmailDoc = {
id: string; // unique id: account|uid
account: string;
folder: string;
uid: number;
subject?: string;
from?: string;
to?: string[];
date?: Date; // ISO
snippet?: string;
body?: string;
tags?: string[]; // AI labels
};