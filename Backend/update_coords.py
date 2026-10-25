import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pymongo import MongoClient

PROJECT_COORDINATES = {
    # Punjab projects (Ludhiana, Moga, Jalandhar, Kapurthala, Bathinda, Barnala, Sirhind/Mohali)
    "DR-0001": {"lat": 30.6822, "lng": 75.8210, "district": "Ludhiana"},
    "DR-0002": {"lat": 30.9530, "lng": 75.6020, "district": "Ludhiana"},
    "DR-0003": {"lat": 31.3260, "lng": 75.3850, "district": "Kapurthala"},
    "DR-0004": {"lat": 31.0510, "lng": 75.2010, "district": "Moga"},
    "DR-0005": {"lat": 30.1250, "lng": 74.9520, "district": "Bathinda"},
    "DR-0006": {"lat": 30.3710, "lng": 75.3240, "district": "Barnala"},
    "DR-0007": {"lat": 30.5540, "lng": 75.0820, "district": "Moga"},
    "DR-0008": {"lat": 30.6420, "lng": 76.5410, "district": "Fatehgarh Sahib"},
    # Himachal Pradesh projects (Mandi, Hamirpur, Pandoh, Sundernagar, Shimla)
    "DR-0009": {"lat": 31.7087, "lng": 76.9320, "district": "Mandi"},
    "DR-0010": {"lat": 31.6862, "lng": 76.5213, "district": "Hamirpur"},
    "DR-0011": {"lat": 31.7240, "lng": 76.7210, "district": "Mandi"},
    "DR-0012": {"lat": 31.6210, "lng": 76.9850, "district": "Mandi"},
    "DR-0013": {"lat": 31.7820, "lng": 77.1230, "district": "Mandi"},
    "DR-0014": {"lat": 31.5340, "lng": 76.8920, "district": "Mandi"},
    "DR-0015": {"lat": 31.0610, "lng": 77.1420, "district": "Shimla"},
    # Karnataka projects (Kushalnagar, Hunsur, Srirangapatna, Shivamogga, Mangalore, Chitradurga, Tumkur, Hoskote, Bengaluru)
    "DR-0016": {"lat": 12.4580, "lng": 75.9610, "district": "Kodagu"},
    "DR-0017": {"lat": 12.3120, "lng": 76.2910, "district": "Mysuru"},
    "DR-0018": {"lat": 12.4210, "lng": 76.6940, "district": "Mandya"},
    "DR-0019": {"lat": 13.9299, "lng": 75.5681, "district": "Shivamogga"},
    "DR-0020": {"lat": 12.9172, "lng": 74.8860, "district": "Dakshina Kannada"},
    "DR-0021": {"lat": 13.7220, "lng": 76.8510, "district": "Chitradurga"},
    "DR-0022": {"lat": 13.1810, "lng": 77.2210, "district": "Tumakuru"},
    "DR-0023": {"lat": 13.0720, "lng": 77.7940, "district": "Bengaluru Rural"},
    # National Major Projects across India
    "DR-0024": {"lat": 21.1702, "lng": 72.8311, "district": "Surat"}, # Mumbai-Ahmedabad High Speed Rail
    "DR-0025": {"lat": 13.0827, "lng": 80.2707, "district": "Chennai"}, # Chennai Metro Rail Phase-II
    "DR-0026": {"lat": 26.9124, "lng": 75.7873, "district": "Jaipur"}, # Western Dedicated Freight Corridor
    "DR-0027": {"lat": 30.1530, "lng": 78.4520, "district": "Tehri Garhwal"}, # Rishikesh-Karnaprayag Rail
    "DR-0028": {"lat": 19.0760, "lng": 72.8777, "district": "Mumbai"}, # Mumbai Urban Transport Project
    "DR-0029": {"lat": 12.9716, "lng": 77.5946, "district": "Bengaluru Urban"}, # Bangalore Suburban Railway
    "DR-0030": {"lat": 24.2515, "lng": 78.1587, "district": "Sagar"}, # Bina Refinery Plant Complex
    "DR-0031": {"lat": 29.4709, "lng": 76.8723, "district": "Panipat"}, # IOCL Panipat Refinery & Petrochemical Complex (Baholi)
    "DR-0032": {"lat": 16.9891, "lng": 82.2475, "district": "Kakinada"}, # KG-DWN-98/2 NELP Block
    "DR-0033": {"lat": 10.8242, "lng": 79.8100, "district": "Nagapattinam"}, # CPCL Cauvery Basin Refinery (Panangudi)
    "DR-0034": {"lat": 22.3705, "lng": 73.1255, "district": "Vadodara"}, # IOCL Gujarat Refinery Koyali Complex
    "DR-0035": {"lat": 21.8329, "lng": 73.7491, "district": "Narmada"}, # Sardar Sarovar Dam Structure
    "DR-0036": {"lat": 17.2560, "lng": 81.6570, "district": "Eluru"}, # Polavaram Dam Site
    "DR-0037": {"lat": 18.2310, "lng": 79.9140, "district": "Warangal"}, # Devadula Lift Irrigation Intake
    "DR-0038": {"lat": 20.8710, "lng": 79.6410, "district": "Bhandara"}, # Gosikhurd Project Dam
    "DR-0039": {"lat": 28.6139, "lng": 77.2090, "district": "New Delhi"}, # BharatNet National
    "DR-0040": {"lat": 23.2599, "lng": 77.4126, "district": "Bhopal"}, # 4G BSNL
    "DR-0041": {"lat": 25.4484, "lng": 78.5685, "district": "Jhansi"}, # Saturation 4G USOF
    "DR-0042": {"lat": 21.1458, "lng": 79.0882, "district": "Nagpur"}, # 4G Network Pan-India Phase IX.2
    "DR-0043": {"lat": 26.8467, "lng": 80.9462, "district": "Lucknow"}, # BharatNet UP East
    "DR-0044": {"lat": 28.5780, "lng": 77.1980, "district": "New Delhi"}, # GPRA Colonies Delhi
    "DR-0045": {"lat": 28.5672, "lng": 77.2100, "district": "New Delhi"}, # AIIMS West Ansari Nagar
    "DR-0046": {"lat": 10.7867, "lng": 76.6548, "district": "Palakkad"}, # Palakkad Node CBIC
    "DR-0047": {"lat": 15.6820, "lng": 78.2210, "district": "Kurnool"}, # Orvakal Industrial Area
    "DR-0048": {"lat": 17.6830, "lng": 77.6040, "district": "Sangareddy"}, # Zaheerabad Node
    "DR-0049": {"lat": 21.7330, "lng": 83.9720, "district": "Jharsuguda"}, # NLC Talabira Thermal Power Site
    "DR-0050": {"lat": 24.1120, "lng": 82.6410, "district": "Singrauli"}, # Jayant Expansion Coal Mine
    "DR-0051": {"lat": 22.3270, "lng": 82.5760, "district": "Korba"}, # Gevra Open Cast Coal Mine Pit
    "DR-0052": {"lat": 21.0820, "lng": 85.0810, "district": "Angul"}, # Gopalji Kaniha OCP
    "DR-0053": {"lat": 23.9510, "lng": 85.0210, "district": "Chatra"}, # RPR Magadh Exp OCP
    "DR-0054": {"lat": 23.7430, "lng": 86.4120, "district": "Dhanbad"}, # Jharia Master Plan Coalfield
    "DR-0055": {"lat": 24.6110, "lng": 84.1440, "district": "Aurangabad"}, # Nabinagar Super Thermal Power Plant
    "DR-0056": {"lat": 18.7560, "lng": 79.4730, "district": "Peddapalli"}, # NTPC Ramagundam Super Thermal Power
    "DR-0057": {"lat": 27.5320, "lng": 72.1810, "district": "Phalodi"}, # Rajasthan Part I Power Transmission
    "DR-0058": {"lat": 23.8960, "lng": 69.8320, "district": "Kutch"}, # Khavda Renewable Energy Park
    "DR-0059": {"lat": 28.3280, "lng": 95.8360, "district": "Lower Dibang Valley"}, # Dibang Dam Site
    "DR-0060": {"lat": 30.3400, "lng": 76.3800, "district": "Patiala"},
    "DR-0061": {"lat": 31.9579, "lng": 77.1095, "district": "Kullu"},
    "DR-0062": {"lat": 12.2958, "lng": 76.6394, "district": "Mysuru"},
    "DR-0063": {"lat": 31.3260, "lng": 75.5762, "district": "Jalandhar"},
    "DR-0064": {"lat": 25.1800, "lng": 75.8300, "district": "Kota"},
    "DR-0065": {"lat": 18.5204, "lng": 73.8567, "district": "Pune"},
    "DR-0066": {"lat": 26.4499, "lng": 80.3319, "district": "Kanpur Nagar"},
    "DR-0067": {"lat": 15.8497, "lng": 74.4977, "district": "Belagavi"},
    "DR-0068": {"lat": 32.2686, "lng": 75.6529, "district": "Pathankot"},
    "DR-0069": {"lat": 28.4595, "lng": 77.0266, "district": "Gurugram"},
}

def update_coordinates():
    # Update MongoDB Atlas
    mongo_uri = os.getenv('MONGO_URI')
    if mongo_uri:
        client = MongoClient(mongo_uri)
        db = client['drishti_db']
        collection = db['projects']
        updated_mongo = 0
        for pid, data in PROJECT_COORDINATES.items():
            res = collection.update_one(
                {"project_id": pid},
                {"$set": {
                    "latitude": data["lat"],
                    "longitude": data["lng"],
                    "district": data["district"]
                }}
            )
            if res.matched_count > 0:
                updated_mongo += 1
        client.close()
        print(f"Updated {updated_mongo} projects in MongoDB Atlas.")

if __name__ == "__main__":
    update_coordinates()
