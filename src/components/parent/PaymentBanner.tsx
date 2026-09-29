import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const PaymentBanner = () => {
    return (
        <div className="w-full mb-6 animate-in fade-in slide-in-from-top duration-500">
            <Alert variant="destructive" className="border-2 border-red-500 bg-red-50 text-red-900 shadow-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div className="ml-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                    <div>
                        <AlertTitle className="text-lg font-bold flex items-center gap-2">
                            Action Requise : Scolarité Impayée
                        </AlertTitle>
                        <AlertDescription className="text-red-800 text-sm font-medium mt-1">
                            Nous avons constaté que vos frais de scolarité n'ont pas encore été réglés pour ce mois.
                            Veuillez régulariser votre situation auprès de l'administration dans les plus brefs délais
                            pour garantir la continuité de l'accès aux services scolaires.
                        </AlertDescription>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <div className="bg-red-600 text-white px-4 py-2 rounded-md font-bold text-sm shadow-md flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Contacter l'Administration
                        </div>
                    </div>
                </div>
            </Alert>
        </div>
    );
};

export default PaymentBanner;
