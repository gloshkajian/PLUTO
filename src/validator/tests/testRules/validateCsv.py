from __future__ import print_function
import os.path
import re
import imp
import sys

plutoAPI = os.environ.get('PLUTOAPI')
if not plutoAPI:
	print("PLUTOAPI enviroment variable must be set and point to the directory containing PythonAPI.py.", file=sys.stderr)
	sys.exit(1)

try:
	apiPath = os.path.join(plutoAPI, "PythonAPI.py")
	api = imp.load_source('PythonAPI', apiPath)
except IOError:
	print("Failed to load the PythonAPI from \"" + plutoAPI + "\".", file=sys.stderr)
	sys.exit(1)

class ValidateCsv(api.PythonCSVRule):
	def __init__(self, config):
		super(ValidateCsv, self).__init__(config)
	
	#start is called at the beginning of processing after the file is opened, and any property processing should happen here	
	def start(self):
		self.warning("start")
		self.count = 0
		
	#processRecord is called once for each record in the csv
	#returns the validated record, which can be modified, and return None to drop the record 
	#  record is the array of column values
	#  isHeaderRow is a boolean which is True if this row is in the csv header
	#  rowNumber is the current line number of the csv, with 1 being the first row
	def processRecord(self, record, isHeaderRow, rowNumber):
		
		self.count = self.count + 1
		
		return record
	
	#finish is called at the end of processing, but before the file is closed
	def finish(self):
		self.warning("finish " + str(self.count))
		
api.process(ValidateCsv)
