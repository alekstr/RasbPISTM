import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)  # set board mode to Broadcom

#GPIO.setup(4, GPIO.OUT)  # set up pin 17
GPIO.setup(26, GPIO.IN, pull_up_down=GPIO.PUD_UP)  # set up pin 17

#GPIO.output(4, 0)  # turn on pin 17

#initialise a previous input variable to 0 (assume button not pressed last)
prev_input = 1
#while True:
  #take a reading
input = GPIO.input(26)
print(input)
  #if the last reading was low and this one high, print
if ((not prev_input) and input):
    print("Button pressed")
  #update previous input
prev_input = input
  #slight pause to debounce
time.sleep(0.05)
