
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Key, Users, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminSecurity = () => {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false
  });

  const securityLogs = [
    { id: 1, action: "Connexion Admin", user: "Admin Ousmane", time: "Il y a 2h", status: "success" },
    { id: 2, action: "Tentative de connexion échouée", user: "Inconnu", time: "Il y a 4h", status: "danger" },
    { id: 3, action: "Modification utilisateur", user: "Admin Ousmane", time: "Il y a 6h", status: "success" },
    { id: 4, action: "Sauvegarde système", user: "Système", time: "Il y a 12h", status: "success" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Sécurité
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">Gestion de la sécurité et des accès</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authentification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Authentification
              </CardTitle>
              <CardDescription>Configuration des méthodes d'authentification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Authentification à deux facteurs</label>
                  <p className="text-sm text-gray-600">Sécurisez votre compte avec 2FA</p>
                </div>
                <Switch 
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
              
              <div>
                <label className="font-medium mb-2 block">Durée de session (minutes)</label>
                <Input
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button className="w-full">
                Changer le mot de passe
              </Button>
            </CardContent>
          </Card>

          {/* Politique de mot de passe */}
          <Card>
            <CardHeader>
              <CardTitle>Politique de mot de passe</CardTitle>
              <CardDescription>Définir les règles de sécurité des mots de passe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="font-medium mb-2 block">Longueur minimale</label>
                <Input
                  type="number"
                  value={passwordPolicy.minLength}
                  onChange={(e) => setPasswordPolicy({...passwordPolicy, minLength: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Majuscules obligatoires</span>
                  <Switch 
                    checked={passwordPolicy.requireUppercase}
                    onCheckedChange={(checked) => setPasswordPolicy({...passwordPolicy, requireUppercase: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Chiffres obligatoires</span>
                  <Switch 
                    checked={passwordPolicy.requireNumbers}
                    onCheckedChange={(checked) => setPasswordPolicy({...passwordPolicy, requireNumbers: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Symboles obligatoires</span>
                  <Switch 
                    checked={passwordPolicy.requireSymbols}
                    onCheckedChange={(checked) => setPasswordPolicy({...passwordPolicy, requireSymbols: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Journaux de sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Journaux de sécurité
            </CardTitle>
            <CardDescription>Historique des actions de sécurité</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${log.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {log.status === 'success' ? 
                        <Shield className="w-4 h-4 text-green-600" /> : 
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div>
                      <h3 className="font-medium">{log.action}</h3>
                      <p className="text-sm text-gray-600">{log.user}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.time}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions de sécurité */}
        <Card>
          <CardHeader>
            <CardTitle>Actions de sécurité</CardTitle>
            <CardDescription>Actions critiques de sécurité</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start">
                <Users className="w-4 h-4 mr-2" />
                Gérer les permissions
              </Button>
              <Button variant="outline" className="justify-start">
                <Key className="w-4 h-4 mr-2" />
                Réinitialiser les mots de passe
              </Button>
              <Button variant="outline" className="justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Audit de sécurité
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSecurity;
