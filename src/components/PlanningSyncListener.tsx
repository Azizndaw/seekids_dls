import React from "react";
import { usePlanningSync } from "@/hooks/useCours";

/**
 * Composant invisible pour la synchronisation temps-réel du planning
 * entre tous les onglets du navigateur sans nécessiter de reconnexion.
 */
const PlanningSyncListener: React.FC = () => {
  usePlanningSync();
  return null;
};

export default PlanningSyncListener;
