app.controller('CreateController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    $scope.mnemonic = window.eztz.crypto.generateMnemonic();
    $scope.password = '';
    $scope.password2 = '';
    $scope.cancel = function(){
        $location.path('/new');
    };
    $scope.create = function(){
        if (!$scope.password || !$scope.password2){
            alert("Please enter your password");
            return;
        }
        if ($scope.password.length < 8){
            alert("Your password is too short");
            return;
        }
        if ($scope.password != $scope.password2){
            alert("Passwords do not match");
            return;
        }
        var identity = {
            temp : {
                mnemonic : $scope.mnemonic,
                password : $scope.password,
            },
            encryptedMnemonic : sjcl.encrypt($scope.password, $scope.mnemonic),
            accounts : [],
        };
        //Create free initial 
        var keys = window.eztz.crypto.generateKeys(identity.temp.mnemonic, identity.temp.password);
        window.eztz.rpc.freeAccount(keys).then(function(r){
          identity.accounts.push({
            title : 'Account 1',
            pkh : r
          });
          Storage.setStore(identity);
          $location.path('/main');
        });
    };
}])
.controller('MainController', ['$scope', '$location', '$http', 'Storage', function($scope, $location, $http, Storage) {
    var ss = Storage.loadStore();
    if (!ss || !ss.encryptedMnemonic){
      //not set or not unlocked
         $location.path('/new');
    }
    $scope.editMode = false;
    $scope.accounts = ss.accounts;
    $scope.account = ss.accounts[0];
    $scope.accountDetails = {};
    $scope.lock = function(){
        ss.temp = {};
        Storage.setStore(ss);
        $location.path('/unlock');
    }
    var updateActive = function(){
      ss.account = {
        balance : $scope.accountDetails.balance,
        title : $scope.account.title,
        tz1 : $scope.account.pkh,
      }
      Storage.setStore(ss);
    }
    $scope.save = function(){
        if (!$scope.account.title){
            alert("Please enter your address title");
            return;
        }
        var i = $scope.accounts.indexOf($scope.account);
        $scope.accounts[i] = $scope.account;
        ss.accounts = $scope.accounts;
        Storage.setStore(ss);
        $scope.refresh();
        $scope.editMode = false;
    };
    $scope.remove = function(){
      var i = $scope.accounts.indexOf($scope.account);
      $scope.accounts.splice(i, 1);
      $scope.account = $scope.accounts[0];
      $scope.refresh();
    };
    $scope.add = function(){
      var keys = window.eztz.crypto.generateKeys(ss.temp.mnemonic, ss.temp.password);
      window.eztz.rpc.freeAccount(keys).then(function(r){
        $scope.$apply(function(){
          var i = $scope.accounts.length + 1;
          var an = "Account " + i;
          $scope.account = {
            title : an,
            pkh : r
          };
          $scope.accounts.push($scope.account);
          ss.accounts = $scope.accounts;
          Storage.setStore(ss);
          $scope.refresh();
        });
      });
    };
    var formatMoney = function(n, c, d, t){
      var c = isNaN(c = Math.abs(c)) ? 2 : c, 
        d = d == undefined ? "." : d, 
        t = t == undefined ? "," : t, 
        s = n < 0 ? "-" : "", 
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))), 
        j = (j = i.length) > 3 ? j % 3 : 0;
       return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
     };
    $scope.loadAccount = function(a){
        $scope.account = a;
        $scope.accountDetails = {
            balance : "Loading...",
            usd : "Loading...",
        };
        $http({
            method: 'POST',
            url: 'https://tezrpc.me/api/blocks/prevalidation/proto/context/contracts/'+a.pkh+"/balance",
            data: '{}'
        }).then(function(r){
            var bal = parseInt(r.data.ok)/100;
            $scope.accountDetails.balance = formatMoney(bal, 2, '.', ',')+"ꜩ";
            var usdbal = bal * 1.78;
            $scope.accountDetails.usd = "$"+formatMoney(usdbal, 2, '.', ',')+"USD";
            updateActive();
        });
        updateActive();
        setTimeout(function(){
        window.jdenticon();
        }, 100);
    }
    $scope.refresh = function(){
        $scope.loadAccount($scope.account);
    };
    $scope.copy = function(){
        copyToClipboard($scope.account.pkh);
    };
    $scope.send = function(){
        window.account = $scope.account;
        $location.path('/send');
    };
    $scope.delegate = function(){
        window.account = $scope.account;
        $location.path('/delegate');
    };
    $scope.qr = function(){
        window.account = $scope.account;
        $location.path('/qr');
    };
    $scope.refresh();
    copyToClipboard = function(text) {
        if (window.clipboardData && window.clipboardData.setData) {
            // IE specific code path to prevent textarea being shown while dialog is visible.
            return clipboardData.setData("Text", text); 

        } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            var textarea = document.createElement("textarea");
            textarea.textContent = text;
            textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
            document.body.appendChild(textarea);
            textarea.select();
            try {
                return document.execCommand("copy");  // Security exception may be thrown by some browsers.
            } catch (ex) {
                console.warn("Copy to clipboard failed.", ex);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }}
}])
.controller('NewController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    var ss = Storage.loadStore();
    if (ss && typeof ss.temp != 'undefined' && ss.temp.mnemonic && ss.temp.password){
        $location.path('/main');
    }  else if (ss && ss.encryptedMnemonic){
        $location.path('/unlock');
    }
    $scope.restore = function(){
        $location.path('/restore');
    };
    $scope.create = function(){
        $location.path('/create');
    };
    
}])
.controller('UnlockController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    var ss = Storage.loadStore();
    if (!ss || !ss.encryptedMnemonic){
         $location.path('/new');
    }
    $scope.clear = function(){
        if (confirm("Are you sure you want to clear you TezBox - note, unless you've backed up your seed words you'll no longer have access to your accounts")){
        Storage.clearStore();
         $location.path('/new');
        }
    }
    $scope.unlock = function(){
        if (!$scope.password){
            alert("Please enter your password");
            return;
        }
        if ($scope.password.length < 8){
            alert("Your password is too short");
            return;
        }
        try {
            var mnemonic = sjcl.decrypt($scope.password, ss.encryptedMnemonic);
        } catch(err){
            console.log(err);
           alert("Incorrect password");
            return;
        }
        var identity = {
            temp : {
                mnemonic : mnemonic,
                password : $scope.password,
            },
            encryptedMnemonic : ss.encryptedMnemonic,
            accounts : ss.accounts,
        };
        Storage.setStore(identity);
        $location.path('/main');
    };
}])
.controller('RestoreController', ['$scope', '$location', function($scope, $location) {
    $scope.cancel = function(){
        $location.path('/new');
    };
    $scope.restore = function(){
        //Load up things here
    };
}])
.controller('SendController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    $scope.sending = false;
    $scope.sendError = false;
    $scope.amount = 0;
    var ss = Storage.loadStore();
    if (!ss || !ss.encryptedMnemonic){
         $location.path('/new');
    }
    $scope.account = window.account;
    $scope.send = function(){
        if (!$scope.amount || !$scope.amount) {
          alert("Please enter amount and a destination");
          return;
        }
        var keys = window.eztz.crypto.generateKeys(ss.temp.mnemonic, ss.temp.password);
        keys.pkh = $scope.account.pkh;
        $scope.sendError = false;
        $scope.sending = true;
        var am = $scope.amount * 100;
        am = am.toFixed(0);
        
        var operation = {
          "kind": "transaction",
          "amount": am,
          "destination": $scope.toaddress,
          "parameters": ($scope.parameters ? eztz.utility.sexp2mic($scope.parameters) : $scope.parameters)
        };
        window.eztz.rpc.sendOperation(operation, keys, 0).then($scope.endPayment);
    }
    $scope.endPayment = function(r){
        $scope.$apply(function(){
          $scope.sending = false;
          if (typeof r.injectedOperation != 'undefined'){
            $location.path('/main');
          } else {
            $scope.sendError = true;
          }
        });
    }
    $scope.cancel = function(){
        $location.path('/main');
    }
}])
.controller('DelegateController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    $scope.delegateType = '';
    $scope.delegate = '';
    $scope.account = window.account;
    window.eztz.node.query('/blocks/head/proto/context/contracts/'+$scope.account.pkh+'/delegate').then(function(r){
      console.log(r);
      $scope.delegate = r;
      if (r == 'tz1TwYbKYYJxw7AyubY4A9BUm2BMCPq7moaC' || r == 'tz1UsgSSdRwwhYrqq7iVp2jMbYvNsGbWTozp'){
        $scope.delegateType = r;
      }
      $scope.$apply(function(){});
    });
    
    $scope.sending = false;
    $scope.sendError = false;
    $scope.amount = 0;
    var ss = Storage.loadStore();
    if (!ss || !ss.encryptedMnemonic){
         $location.path('/new');
    }
    $scope.save = function(){
        if ($scope.delegateType) $scope.delegate = $scope.delegateType;
        if (!$scope.delegate) {
          alert("Please select a valid delegate");
          return;
        }
        var keys = window.eztz.crypto.generateKeys(ss.temp.mnemonic, ss.temp.password);
        keys.pkh = $scope.account.pkh;
        $scope.sendError = false;
        $scope.sending = true;
        
        window.eztz.rpc.setDelegate(keys, $scope.account.pkh, $scope.delegate, 0).then($scope.end);
    }
    $scope.end = function(r){
        $scope.$apply(function(){
          $scope.sending = false;
          if (typeof r.injectedOperation != 'undefined'){
            $location.path('/main');
          } else {
            $scope.sendError = true;
          }
        });
    }
    $scope.cancel = function(){
        $location.path('/main');
    }
}])
.controller('QrController', ['$scope', '$location', 'Storage', function($scope, $location, Storage) {
    $scope.account = window.account;
    $scope.cancel = function(){
        $location.path('/main');
    }
}])
;
