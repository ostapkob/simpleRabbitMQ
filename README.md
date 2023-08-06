# simpleRabbitMQ


install modules
```
npm i
```

# m1.js 
get Http request convert text to Caps and sent to m2
text -> TEXT


# m2.js 
get task queue and revers TEXT and send to result queue
TEXT -> TXET


# m1.js 
get from result queue  and add !
TXET -> TXET!
