INSERT INTO "Industry" ("id", "name", "slug", "description", "icon", "active", "homepagePreset", "updatedAt")
VALUES (
    'industry-boutiques',
    'Boutiques',
    'boutiques',
    'Clothing, shoes, and style for men, women, and children.',
    'shirt',
    true,
    '{"heroTitle":"Find Your Everyday Style","heroHighlight":"Made to Move With You","heroDescription":"Discover thoughtfully selected clothing and shoes for men, women, and children, all from one welcoming boutique.","heroPrimaryLabel":"Shop the Collection","heroPrimaryHref":"/products","heroSecondaryLabel":"Browse Categories","heroSecondaryHref":"/products","categoryTitle":"Shop the Collection","featuredTitle":"New Season Favourites"}'::jsonb,
    CURRENT_TIMESTAMP
);

INSERT INTO "Theme" ("id", "name", "slug", "industryId", "colors", "typography", "heroLayout", "bannerStyle", "productGridStyle", "updatedAt")
VALUES (
    'theme-boutiques',
    'Boutique Theme',
    'boutique-theme',
    'industry-boutiques',
    '{"primary":"#713f4a","primaryLight":"#e8cfd0","primaryDark":"#512d36","accent":"#c18a62","background":"#f7f1ed","surface":"#fffaf7","text":"#302427","muted":"#74656a","border":"#e5d9d5","darkBackground":"#211a1c","darkSurface":"#302528","darkText":"#fff7f3","darkMuted":"#d5c5c1","darkBorder":"#554348"}'::jsonb,
    '{"body":"inter","heading":"georgia"}'::jsonb,
    'editorial',
    'soft',
    'editorial',
    CURRENT_TIMESTAMP
);

UPDATE "Industry" SET "defaultThemeId" = 'theme-boutiques' WHERE "id" = 'industry-boutiques';

INSERT INTO "IndustryCategoryTemplate" ("id", "industryId", "name", "slug", "description", "imageUrl", "displayOrder", "active") VALUES
('category-template-boutiques-men-clothing', 'industry-boutiques', 'Men''s Clothing', 'mens-clothing', 'Everyday and occasion clothing for men.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80', 1, true),
('category-template-boutiques-women-clothing', 'industry-boutiques', 'Women''s Clothing', 'womens-clothing', 'Clothing and accessories for women.', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80', 2, true),
('category-template-boutiques-children-clothing', 'industry-boutiques', 'Children''s Clothing', 'childrens-clothing', 'Comfortable clothing for children.', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1000&q=80', 3, true),
('category-template-boutiques-mens-shoes', 'industry-boutiques', 'Men''s Shoes', 'mens-shoes', 'Shoes for work, weekends, and special occasions.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80', 4, true),
('category-template-boutiques-womens-shoes', 'industry-boutiques', 'Women''s Shoes', 'womens-shoes', 'Shoes for every occasion and season.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80', 5, true),
('category-template-boutiques-childrens-shoes', 'industry-boutiques', 'Children''s Shoes', 'childrens-shoes', 'Comfortable shoes for growing feet.', 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=1000&q=80', 6, true);

INSERT INTO "StoreType" ("id", "industryId", "name", "slug", "description", "updatedAt")
VALUES ('store-type-boutiques-retail', 'industry-boutiques', 'Boutique', 'boutique', 'Clothing and footwear retail.', CURRENT_TIMESTAMP);

INSERT INTO "ProductAttributeDefinition" ("id", "industryId", "name", "key", "type", "required", "options", "displayOrder", "active", "updatedAt") VALUES
('attribute-boutiques-audience', 'industry-boutiques', 'For', 'audience', 'DROPDOWN', true, ARRAY['Men', 'Women', 'Children']::TEXT[], 1, true, CURRENT_TIMESTAMP),
('attribute-boutiques-clothing-size', 'industry-boutiques', 'Available clothing sizes', 'clothing_size', 'MULTI_SELECT', false, ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', '2-3 years', '4-5 years', '6-7 years', '8-9 years', '10-11 years', '12-13 years']::TEXT[], 2, true, CURRENT_TIMESTAMP),
('attribute-boutiques-shoe-size', 'industry-boutiques', 'Available shoe sizes', 'shoe_size', 'MULTI_SELECT', false, ARRAY['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']::TEXT[], 3, true, CURRENT_TIMESTAMP),
('attribute-boutiques-color', 'industry-boutiques', 'Color', 'color', 'MULTI_SELECT', false, ARRAY['Black', 'White', 'Blue', 'Brown', 'Green', 'Red', 'Pink', 'Beige', 'Multi-colour']::TEXT[], 4, true, CURRENT_TIMESTAMP),
('attribute-boutiques-material', 'industry-boutiques', 'Material', 'material', 'TEXT', false, ARRAY[]::TEXT[], 5, true, CURRENT_TIMESTAMP);
