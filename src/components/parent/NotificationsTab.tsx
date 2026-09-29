
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: number;
  type: string;
  message: string;
  time: string;
  urgent: boolean;
}

interface NotificationsTabProps {
  notifications: Notification[];
}

const NotificationsTab = ({ notifications }: NotificationsTabProps) => {
  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Notifications récentes</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">Alertes et informations importantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} 
                 className={`p-4 rounded-lg border-l-4 ${
                   notification.urgent 
                     ? 'bg-red-50 dark:bg-red-900/20 border-red-500' 
                     : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                 }`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white">{notification.message}</p>
                <span className="text-sm text-gray-500 dark:text-gray-400">{notification.time}</span>
              </div>
              {notification.urgent && (
                <Badge className="mt-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Urgent</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsTab;
