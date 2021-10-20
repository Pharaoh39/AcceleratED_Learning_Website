import mysql.connector as mysql

class Database:
	"""Handles operations with the database"""
	def __init__(self, user, password, db='read_only'):
		self.user = user
		self.password = password
		self.assert_exists(user, password, db)
		self.connection = self._connect(self.user, self.password, self.db)


	def _connect(self, user, password, db):
		connection = None
		try:
			connection = mysql.connect(user=self.user, password=self.password, db=self.db)
		except mysql.Error as e:
			print(e)
			return None
		return connection
		
	def __enter__():
		return self

	def __exit__():
		self.connection.close()

	def execute(self, query: str):
		try:
			with self.connection.cursor() as cursor:
				cursor.execute(query)
		except mysql.Error as e:
			print(e)

	def assert_exists(self, usr, pw, db: str):
		connection = mysql.connect(user=usr, password=pw)
		with connection.cursor() as cursor:
			cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db}")