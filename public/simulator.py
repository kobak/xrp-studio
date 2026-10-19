import sys, types, json, math, time as _real_time, traceback
_clock = _real_time.monotonic
_start_time = _clock()
_steps = 0
_events = []
_state = json.loads(_initial_json)
_state.setdefault('x', -50)
_state.setdefault('y', -45)
_state.setdefault('heading', 0)
_efforts = [0, 0]

def _sensors():
    angle = math.radians(_state['heading'])
    dx, dy = -math.sin(angle), math.cos(angle)
    distances = [200]
    for axis, d in [('x', dx), ('y', dy)]:
        if abs(d) > 0.00001:
            distances.append(((96 if d > 0 else -96) - _state[axis]) / d)
    ox, oy = _state['x'] - 45, _state['y'] - 30
    b = ox*dx + oy*dy
    det = b*b - (ox*ox + oy*oy - 14*14)
    if det >= 0:
        hit = -b-math.sqrt(det)
        if hit >= 0: distances.append(hit)
    _state['distance'] = round(max(0, min(d for d in distances if d >= 0)), 1)
    for side, offset in [('left', -3), ('right', 3)]:
        sx = _state['x'] + dx*5 + offset*math.cos(angle)
        sy = _state['y'] + dy*5 + offset*math.sin(angle)
        dark = (abs(sx+50)<2 and -65<sy<50) or (abs(sy-50)<2 and -50<sx<50)
        _state[side] = 0.12 if dark else 0.9
    return _state

def _emit(kind, duration=0):
    if len(_events) >= 1500:
        raise RuntimeError('Simulation command limit (1500). Shorten your loop.')
    _sensors()
    _events.append(dict(type=kind, duration=duration, state=dict(_state)))

def _move(distance):
    angle = math.radians(_state['heading'])
    pieces = max(1, int(abs(distance)))
    for i in range(pieces):
        x = _state['x'] - math.sin(angle)*distance/pieces
        y = _state['y'] + math.cos(angle)*distance/pieces
        if not (-92<x<92 and -92<y<92) or (x-45)**2+(y-30)**2 < 18**2:
            break
        _state['x'], _state['y'] = x, y

class Drive:
    def straight(self, distance, max_effort=0.5, **kwargs):
        _efforts[:] = [0, 0]
        _move(max(-1000,min(1000,float(distance))))
        _emit('move', min(3, abs(distance)/max(1, abs(max_effort)*40)))
        return True
    def turn(self, turn_degrees, max_effort=0.5, **kwargs):
        _efforts[:] = [0, 0]
        _state['heading'] += float(turn_degrees)
        _emit('turn', abs(turn_degrees)/150)
        return True
    def set_effort(self,left_effort,right_effort):
        _efforts[:] = [max(-1,min(1,left_effort)), max(-1,min(1,right_effort))]
    def set_speed(self,left_speed=0,right_speed=0): self.set_effort(left_speed/40,right_speed/40)
    def stop(self):
        _efforts[:] = [0,0]
        _emit('stop')
    def arcade(self,straight,turn): self.set_effort(straight-turn,straight+turn)

class Range:
    def distance(self): return _sensors()['distance']
class Reflectance:
    def get_left(self): return _sensors()['left']
    def get_right(self): return _sensors()['right']
class IMU:
    def get_yaw(self): return _state['heading'] % 360
    def reset_yaw(self): _state['heading']=0
class Board:
    def led_on(self): _state['led']=True; _emit('led')
    def led_off(self): _state['led']=False; _emit('led')
    def is_button_pressed(self): return bool(_state.get('button',False))
    def wait_for_button(self):
        if not self.is_button_pressed(): raise RuntimeError('Press the virtual user button before running this program.')
    def set_rgb_led(self,r,g,b): _state['led']=bool(r or g or b); _emit('led')
class Servo:
    def set_angle(self,angle): _state['servo']=max(0,min(180,angle));_emit('servo')
def _sleep(seconds):
    seconds=max(0,min(60,float(seconds)))
    slices=max(1,int(seconds*20))
    for i in range(slices):
        left,right=_efforts
        _state['heading']+=(right-left)*90*seconds/slices
        _move((left+right)*20*seconds/slices)
    _emit('wait',seconds)
def _print(*args,sep=' ',end='\n',**kwargs):
    if len(_events)>=1500:raise RuntimeError('Simulation output limit (1500).')
    _events.append(dict(type='print',text=sep.join(str(a) for a in args)+end))

_defaults=types.ModuleType('XRPLib.defaults')
_defaults.drivetrain=Drive();_defaults.rangefinder=Range();_defaults.reflectance=Reflectance();_defaults.imu=IMU();_defaults.board=Board();_defaults.servo_one=Servo();_defaults.servo_two=Servo()
_lib=types.ModuleType('XRPLib');_lib.__path__=[]
sys.modules['XRPLib']=_lib;sys.modules['XRPLib.defaults']=_defaults
for _name,_cls,_getter,_obj in [('differential_drive',Drive,'get_default_differential_drive',_defaults.drivetrain),('rangefinder',Range,'get_default_rangefinder',_defaults.rangefinder),('reflectance',Reflectance,'get_default_reflectance',_defaults.reflectance),('imu',IMU,'get_default_imu',_defaults.imu),('board',Board,'get_default_board',_defaults.board),('servo',Servo,'get_default_servo',_defaults.servo_one)]:
    setattr(_cls,_getter,staticmethod(lambda *a,_o=_obj,**k:_o))
    _mod=types.ModuleType('XRPLib.'+_name)
    setattr(_mod,{'differential_drive':'DifferentialDrive','imu':'IMU'}.get(_name,_name.capitalize()),_cls)
    sys.modules['XRPLib.'+_name]=_mod
_time=types.ModuleType('time');_time.sleep=_sleep;_time.time=_real_time.time;_time.monotonic=_clock;_time.sleep_ms=lambda ms:_sleep(ms/1000);_time.ticks_ms=lambda:int(_clock()*1000)
sys.modules['time']=_time
def _trace(frame,event,arg):
    global _steps
    _steps+=1
    if _steps>500000 or _clock()-_start_time>5:
        raise RuntimeError('Simulation execution limit. Check for an endless loop.')
    return _trace
_error=None
try:
    _namespace={'__name__':'__main__','print':_print}
    sys.settrace(_trace)
    exec(compile(_program,'my_robot.py','exec'),_namespace)
except BaseException as e:
    _error=''.join(traceback.format_exception(type(e),e,e.__traceback__))
finally:
    sys.settrace(None)
    _efforts[:]=[0,0]
    if len(_events)<1500: _emit('stop')
json.dumps(dict(events=_events,error=_error))
