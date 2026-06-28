-- db/seeds/sample_data.sql
-- Run after migration to insert test data
-- psql -d preisgucken -f db/seeds/sample_data.sql

INSERT INTO categories (name, slug) VALUES
  ('Elektronik',        'elektronik'),
  ('Smartphones',       'smartphones'),
  ('Laptops',           'laptops'),
  ('TV & Audio',        'tv-audio'),
  ('Haushaltsgeräte',   'haushaltsgeraete'),
  ('Möbel & Wohnen',   'moebel-wohnen'),
  ('Mode',              'mode'),
  ('Sport & Freizeit',  'sport-freizeit')
ON CONFLICT (name) DO NOTHING;

INSERT INTO vendors (name, url) VALUES
  ('Amazon',    'https://www.amazon.de'),
  ('MediaMarkt','https://www.mediamarkt.de'),
  ('Saturn',    'https://www.saturn.de'),
  ('Otto',      'https://www.otto.de'),
  ('Zalando',   'https://www.zalando.de')
ON CONFLICT (name) DO NOTHING;

-- Sample products (search_vector auto-filled by trigger)
INSERT INTO products (external_id, title, description, price, category, vendor, image, url) VALUES
  ('TEST001', 'iPhone 15 Pro 256GB',     'Apples neuestes Flagship-Smartphone', 1199.00, 'Smartphones',  'Amazon',     '/placeholder.png', 'https://amazon.de'),
  ('TEST002', 'Samsung Galaxy S24',      'Android Flaggschiff 2024',            999.00,  'Smartphones',  'MediaMarkt', '/placeholder.png', 'https://mediamarkt.de'),
  ('TEST003', 'MacBook Air M3',          '13 Zoll, 8GB RAM, 256GB SSD',         1299.00, 'Laptops',      'Amazon',     '/placeholder.png', 'https://amazon.de'),
  ('TEST004', 'Sony WH-1000XM5',         'Noise-Cancelling Kopfhörer',          299.00,  'Elektronik',   'Saturn',     '/placeholder.png', 'https://saturn.de'),
  ('TEST005', 'LG OLED 55 Zoll 4K TV',  'OLED Display, 120Hz',                 799.00,  'TV & Audio',   'MediaMarkt', '/placeholder.png', 'https://mediamarkt.de'),
  ('TEST006', 'Dyson V15 Detect',        'Kabelloser Staubsauger',              649.00,  'Haushaltsgeräte','Otto',     '/placeholder.png', 'https://otto.de'),
  ('TEST007', 'Nike Air Max 2024',       'Laufschuhe Herren',                    129.00,  'Sport & Freizeit','Zalando', '/placeholder.png', 'https://zalando.de'),
  ('TEST008', 'IKEA KALLAX Regal',       '4x4, weiß, 147x147cm',                199.00,  'Möbel & Wohnen','Otto',     '/placeholder.png', 'https://otto.de')
ON CONFLICT (external_id) DO NOTHING;

-- Update sample products with schedule examples
UPDATE products SET
  active_from  = NOW() - INTERVAL '7 days',
  active_until = NULL                           -- active indefinitely
WHERE external_id IN ('TEST001','TEST002','TEST003','TEST004');

UPDATE products SET
  active_from  = NOW() + INTERVAL '2 days',    -- scheduled, not yet active
  active_until = NOW() + INTERVAL '30 days'
WHERE external_id = 'TEST005';

UPDATE products SET
  active_from  = NOW() - INTERVAL '30 days',
  active_until = NOW() - INTERVAL '1 day'      -- already expired
WHERE external_id = 'TEST006';
