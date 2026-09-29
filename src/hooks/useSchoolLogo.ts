/**
 * Hook to get the school logo URL.
 * Returns the school's custom logo if available, otherwise returns the default logo.
 */
export const useSchoolLogo = () => {
    // Hardcoded school for Dakar Leaders School
    const clientName = "dakar-leaders-school";

    // Default logo - now in assets folder
    const logo = `/assets/logos/${clientName}.png`;

    return logo;
};
