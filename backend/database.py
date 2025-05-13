import sqlite3
import os
import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash

class Database:
    def __init__(self, db_path='database.db'):
        self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_path)
        self.init_db()
    
    def get_connection(self):
        """Get a connection to the database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # This enables access to data by column name
        return conn
    
    def init_db(self):
        """Initialize database tables if they don't exist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            organization TEXT,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            profile_image TEXT
        )
        ''')
        
        # Create detections table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            detection_id TEXT UNIQUE NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            filename TEXT NOT NULL,
            processed_filename TEXT,
            detection_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            coordinates TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')
        
        # Create settings table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            setting_name TEXT UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        
        # Check if we need to add default admin user
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        admin_count = cursor.fetchone()[0]
        
        if admin_count == 0:
            self.add_user(
                email='admin@example.com',
                password='admin',
                name='Admin User',
                role='admin'
            )
            self.add_user(
                email='user@example.com',
                password='password',
                name='Test User',
                role='user'
            )
            
        conn.close()
    
    # User management functions
    def add_user(self, email, password, name, role='user', organization=None, phone=None):
        """Add a new user to the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        password_hash = generate_password_hash(password)
        
        try:
            cursor.execute(
                "INSERT INTO users (email, password_hash, name, role, organization, phone) VALUES (?, ?, ?, ?, ?, ?)",
                (email, password_hash, name, role, organization, phone)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            # Email already exists
            return None
        finally:
            conn.close()
    
    def get_user_by_email(self, email):
        """Get a user by email"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            return dict(user)
        return None
    
    def verify_user(self, email, password):
        """Verify a user's credentials"""
        user = self.get_user_by_email(email)
        
        if not user:
            return None
        
        if check_password_hash(user['password_hash'], password):
            # Update last login time
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                "UPDATE users SET last_login = ? WHERE id = ?",
                (datetime.datetime.now().isoformat(), user['id'])
            )
            conn.commit()
            conn.close()
            
            # Remove password_hash from the returned user data
            user.pop('password_hash')
            return user
            
        return None
    
    def update_user_profile(self, user_id, name=None, organization=None, phone=None, profile_image=None):
        """Update a user's profile information"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if name:
            updates.append("name = ?")
            params.append(name)
        
        if organization:
            updates.append("organization = ?")
            params.append(organization)
        
        if phone:
            updates.append("phone = ?")
            params.append(phone)
        
        if profile_image:
            updates.append("profile_image = ?")
            params.append(profile_image)
        
        if not updates:
            return False
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        params.append(user_id)
        
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        
        return cursor.rowcount > 0
    
    def change_password(self, user_id, new_password):
        """Change a user's password"""
        password_hash = generate_password_hash(new_password)
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id)
        )
        conn.commit()
        conn.close()
        
        return cursor.rowcount > 0
    
    # Detection management functions
    def add_detection(self, detection_data, user_id=None):
        """Add a new detection record"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Convert coordinates to JSON string if needed
        if 'coordinates' in detection_data and detection_data['coordinates'] is not None:
            if not isinstance(detection_data['coordinates'], str):
                detection_data['coordinates'] = json.dumps(detection_data['coordinates'])
        
        cursor.execute(
            """
            INSERT INTO detections
            (user_id, detection_id, timestamp, filename, processed_filename, detection_type, confidence, coordinates)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                detection_data['detection_id'],
                detection_data.get('timestamp', datetime.datetime.now().isoformat()),
                detection_data['filename'],
                detection_data.get('processed_filename'),
                detection_data['detection_type'],
                detection_data['confidence'],
                detection_data.get('coordinates')
            )
        )
        conn.commit()
        conn.close()
        
        return cursor.lastrowid
    
    def get_detections(self, limit=100, user_id=None):
        """Get detection records, optionally filtered by user_id"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM detections"
        params = []
        
        if user_id:
            query += " WHERE user_id = ?"
            params.append(user_id)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        detections = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        # Parse coordinates from JSON
        for detection in detections:
            if detection['coordinates']:
                try:
                    detection['coordinates'] = json.loads(detection['coordinates'])
                except json.JSONDecodeError:
                    detection['coordinates'] = None
        
        return detections
    
    def get_detection_by_id(self, detection_id):
        """Get a detection by its unique ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM detections WHERE detection_id = ?", (detection_id,))
        detection = cursor.fetchone()
        
        conn.close()
        
        if not detection:
            return None
        
        detection = dict(detection)
        
        # Parse coordinates from JSON
        if detection['coordinates']:
            try:
                detection['coordinates'] = json.loads(detection['coordinates'])
            except json.JSONDecodeError:
                detection['coordinates'] = None
        
        return detection
    
    # Settings management
    def get_setting(self, setting_name):
        """Get a setting value by name"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT setting_value FROM settings WHERE setting_name = ?", (setting_name,))
        result = cursor.fetchone()
        
        conn.close()
        
        if result:
            return result['setting_value']
        return None
    
    def set_setting(self, setting_name, setting_value):
        """Set a setting value"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO settings (setting_name, setting_value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(setting_name) 
            DO UPDATE SET setting_value = ?, updated_at = ?
            """,
            (
                setting_name, 
                setting_value, 
                datetime.datetime.now().isoformat(),
                setting_value,
                datetime.datetime.now().isoformat()
            )
        )
        conn.commit()
        conn.close()
        
        return True
    
    # Statistics functions
    def get_detection_stats(self):
        """Get detection statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get counts by detection type
        cursor.execute(
            """
            SELECT detection_type, COUNT(*) as count
            FROM detections
            GROUP BY detection_type
            """
        )
        detection_types = {row['detection_type']: row['count'] for row in cursor.fetchall()}
        
        # Get average confidence
        cursor.execute("SELECT AVG(confidence) as avg_confidence FROM detections")
        avg_confidence = cursor.fetchone()['avg_confidence']
        
        # Get counts by month (last 6 months)
        cursor.execute(
            """
            SELECT 
                strftime('%Y-%m', timestamp) as month,
                detection_type,
                COUNT(*) as count
            FROM detections
            WHERE timestamp >= date('now', '-6 months')
            GROUP BY month, detection_type
            ORDER BY month
            """
        )
        by_month = {}
        for row in cursor.fetchall():
            month = row['month']
            if month not in by_month:
                by_month[month] = {}
            by_month[month][row['detection_type']] = row['count']
        
        conn.close()
        
        return {
            'detection_types': detection_types,
            'avg_confidence': avg_confidence,
            'by_month': by_month
        }