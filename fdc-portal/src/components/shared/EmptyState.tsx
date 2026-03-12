import React from 'react';
import { FileText } from 'lucide-react';

export function EmptyState({ title, description, icon: Icon = FileText }: { title: string, description: string, icon?: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-gray-200 border-dashed">
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}
