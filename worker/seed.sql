INSERT OR REPLACE INTO products
(id,sku,name,category,emoji,supplier_name,location,price,unit,moq,stock,rating,tiers_json,active)
VALUES
(1,'RICE-PB50','Premium Parboiled Rice','Grains','🍚','Eastern Grain Depot','Onitsha',74000,'50kg bag',5,120,4.8,'[[5,74000],[20,72500],[50,71000]]',1),
(2,'RICE-OF25','Local Ofada Rice','Grains','🌾','Green Basket Foods','Abeokuta',54500,'25kg bag',4,68,4.7,'[[4,54500],[15,53000],[40,51500]]',1),
(3,'PALM-25L','Red Palm Oil','Oils','🫙','Niger Delta Oils','Port Harcourt',42000,'25L keg',3,92,4.9,'[[3,42000],[10,40500],[30,39000]]',1),
(4,'VEGOIL-25','Vegetable Cooking Oil','Oils','🧴','Prime Foods Wholesale','Lagos',36800,'25L keg',4,75,4.6,'[[4,36800],[12,35500],[36,34200]]',1),
(5,'SOFT-CRT','Soft Drink Assorted','Beverages','🥤','Metro Drinks Hub','Enugu',9700,'carton',10,240,4.8,'[[10,9700],[30,9400],[80,9050]]',1),
(6,'MALT-CRT','Malt Drink','Beverages','🍺','City Beverage Depot','Abuja',14200,'carton',8,146,4.5,'[[8,14200],[25,13700],[60,13250]]',1),
(7,'FLOUR-50','Baking Flour','Flour & Baking','🥣','Millers Direct','Kano',51500,'50kg bag',5,89,4.7,'[[5,51500],[20,50000],[50,48600]]',1),
(8,'DETERG-CRT','Laundry Detergent','Household','🧼','Everyday FMCG Supply','Aba',18400,'carton',6,105,4.6,'[[6,18400],[20,17750],[50,17100]]',1);