-- 1. Supprimer les 6 doubles émargements de 1er S2 (en gardant ceux de 1er L2, et en ne touchant pas à M. NDAW)
DELETE FROM EmargementClasse WHERE emargementId IN (
  '44b6f68f-8729-493d-a7c6-f55b87975114', -- 2026-10-14 11:30-12:10 | Education religieuse | M. NDACK
  '7742a71c-61d7-4dc8-972a-595bdafdfef4', -- 2026-10-15 15:30-16:50 | EPS | M. FAYE EPS
  '0361a00a-339e-4d03-868c-bfd73ca29259', -- 2026-10-21 11:30-12:10 | Education religieuse | M. NDACK
  'd9960807-9325-4dca-a131-5e9535f1d66c', -- 2026-10-27 10:40-11:20 | Education religieuse | M. NDACK
  'dd08044e-48c1-46a4-a106-e002a637f774', -- 2026-10-28 11:30-12:10 | Education religieuse | M. NDACK
  'ef77359b-7f01-4b1f-b308-e1e5057d0392'  -- 2026-10-30 09:50-13:00 | Français | M.T. FALL
);

DELETE FROM Emargement WHERE id IN (
  '44b6f68f-8729-493d-a7c6-f55b87975114',
  '7742a71c-61d7-4dc8-972a-595bdafdfef4',
  '0361a00a-339e-4d03-868c-bfd73ca29259',
  'd9960807-9325-4dca-a131-5e9535f1d66c',
  'dd08044e-48c1-46a4-a106-e002a637f774',
  'ef77359b-7f01-4b1f-b308-e1e5057d0392'
);

-- 2. Supprimer les 10 créneaux de cours en doublon sur 1er S2 (qui sont en commun avec 1er L2, sauf M. NDAW)
DELETE FROM Cours WHERE id IN (
  '71508771-a3a5-4631-9fa7-8aa785792590', -- Jeudi 11h30 - 13h00 | Education religieuse | M. NDACK
  'd708dcce-0ee8-419e-830d-cb124fa4aaca', -- Jeudi 14h00 - 15h20 | Histoire-Géographie | M. NGOM (HG)
  '6448c8d2-59ce-4850-a598-eb537a0e81c6', -- Mardi 11h30 - 13h00 | Histoire-Géographie | M. NGOM (HG)
  '2557a61e-e634-44c9-8df8-b4005a08a827', -- Mercredi 08h00 - 09h30 | Français | M.T. FALL
  'd991fd26-6250-4098-abb2-c3f102a62da6', -- Mercredi 11h30 - 13h00 | Histoire-Géographie | M. NGOM (HG)
  '7620777d-a125-49a3-a7fa-c5f067f0e3fc', -- Vendredi 08h00 - 09h30 | EPS | M. FAYE EPS
  '8ddb61f4-67e4-43cb-b048-00bb38207a5f', -- Vendredi 09h50 - 11h20 | Anglais | M. GNING (Anglais)
  'bd02916e-6a65-46a5-979c-95f86ae0b449', -- Vendredi 11h30 - 13h00 | Français | M.T. FALL
  'df2cef31-85c3-47da-ba86-f2ae4d194ea9', -- Vendredi 14h00 - 15h20 | Anglais | M. GNING (Anglais)
  '28d9676a-a225-45fe-bbaf-909451d59f5b'  -- Vendredi 15h30 - 16h50 | Français | M.T. FALL
);
