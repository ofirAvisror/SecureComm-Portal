INSERT INTO sectors (name, description) VALUES
  ('Residential', 'Home internet subscribers'),
  ('Business', 'Small and medium business sector'),
  ('Enterprise', 'Large corporate clients')
ON CONFLICT (name) DO NOTHING;

INSERT INTO packages (name, speed_mbps, monthly_price) VALUES
  ('Basic 100', 100, 49.90),
  ('Plus 300', 300, 79.90),
  ('Fiber 1000', 1000, 119.90)
ON CONFLICT (name) DO NOTHING;
