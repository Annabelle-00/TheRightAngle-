import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, PlayCircle, StopCircle, CheckCircle, Zap, Activity, Repeat, ChevronsRight, TrendingUp, Save, Target, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import ForceDataChart from '@/components/ForceDataChart';
import ProgressCircle from '@/components/ProgressCircle';

const TARGET_ROM_FOR_STRENGTH_TEST = 100;

const MeasurementPage = ({ 
  updateResults, 
  liveForceDataPoints, 
  liveAngleDataPoints,
  setLiveForceDataPoints, 
  setLiveAngleDataPoints,
  liveRomValue,
  liveStrengthValue,
  isBaselineSetting = false 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(3);
  const [strengthTestActive, setStrengthTestActive] = useState(false);
  
  const [currentMeasurementPhaseData, setCurrentMeasurementPhaseData] = useState([]);
  const strengthTestDataRef = useRef([]);
  const strengthTestStartTimeRef = useRef(null);
  const strengthTestEndTimeRef = useRef(null);
  
  const [initialContractedRom, setInitialContractedRom] = useState(null); 
  const [romAtLockForStrengthTest, setRomAtLockForStrengthTest] = useState(null);
  const [finalMaxRomValue, setFinalMaxRomValue] = useState(null); 
  const [currentAngleForProgress, setCurrentAngleForProgress] = useState(0);
  const [targetRomReachedForStrengthTest, setTargetRomReachedForStrengthTest] = useState(false);

  const pageTitle = isBaselineSetting ? "Set Baseline Measurement" : "Take New Measurement";
  const endButtonText = isBaselineSetting ? "Save Baseline" : "End Test & View Results";
  const endButtonIcon = isBaselineSetting ? <Save className="ml-2 h-5 w-5" /> : <StopCircle className="ml-2 h-5 w-5" />;

  useEffect(() => {
    document.title = `The Right Angle - ${pageTitle}`;
    strengthTestDataRef.current = [];
    setCurrentMeasurementPhaseData([]);
    setLiveForceDataPoints([]); 
    setLiveAngleDataPoints([]);
    setInitialContractedRom(null);
    setRomAtLockForStrengthTest(null);
    setFinalMaxRomValue(null);
    setCurrentAngleForProgress(0);
    setTargetRomReachedForStrengthTest(false);
  }, [setLiveForceDataPoints, setLiveAngleDataPoints, pageTitle]);

  useEffect(() => {
    if (liveRomValue !== null) {
      if (step === 1) {
        setCurrentAngleForProgress(liveRomValue); 
        if (initialContractedRom === null) {
          setInitialContractedRom(liveRomValue); 
        }
        if (liveRomValue >= TARGET_ROM_FOR_STRENGTH_TEST && !targetRomReachedForStrengthTest) {
          setTargetRomReachedForStrengthTest(true);
          setRomAtLockForStrengthTest(liveRomValue); 
          toast({ title: `Target ROM Reached! (${liveRomValue.toFixed(1)}°)`, description: "Lock the brace and prepare for strength test.", variant: "success" });
        } else if (liveRomValue < TARGET_ROM_FOR_STRENGTH_TEST && targetRomReachedForStrengthTest) {
          setTargetRomReachedForStrengthTest(false); 
        }
      } else if (step === 3) { 
        setFinalMaxRomValue(prev => prev === null ? liveRomValue : Math.max(prev, liveRomValue));
      }
    }
  }, [liveRomValue, step, initialContractedRom, targetRomReachedForStrengthTest, toast]);

  useEffect(() => {
    if (strengthTestActive) {
      const updatedLivePoints = liveForceDataPoints.map(p_map => ({ ...p_map, isRelevant: true }));
      setCurrentMeasurementPhaseData(updatedLivePoints);
      
      updatedLivePoints.forEach(p_foreach => {
        if (p_foreach.timestamp >= strengthTestStartTimeRef.current && p_foreach.timestamp <= strengthTestEndTimeRef.current) {
           if (!strengthTestDataRef.current.find(ap => ap.timestamp === p_foreach.timestamp)) {
             strengthTestDataRef.current.push(p_foreach);
           }
        }
      });
    } else {
      setCurrentMeasurementPhaseData([]);
    }
  }, [liveForceDataPoints, strengthTestActive]);

  useEffect(() => {
    let interval;
    if (strengthTestActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (strengthTestActive && timer === 0) {
      strengthTestEndTimeRef.current = Date.now();
      setStrengthTestActive(false);
      setStep(3); 
      toast({ title: "Strength Test Complete", description: "Unlock the brace and continue extending your arm.", variant: "success" });
    }
    return () => clearInterval(interval);
  }, [strengthTestActive, timer, toast]);

  const handleNextStep = () => {
    if (step === 1 && targetRomReachedForStrengthTest) { 
      setStep(2);
      toast({ title: "Step 2: Strength Test", description: "Ensure brace is locked. Press 'Start Strength Test'.", variant: "default" });
    } else if (step === 1 && !targetRomReachedForStrengthTest) {
      toast({ title: "Target Not Reached", description: `Please extend your arm to approximately ${TARGET_ROM_FOR_STRENGTH_TEST} degrees.`, variant: "warning" });
    } else if (step === 3) {
      if (finalMaxRomValue === null) {
         toast({ title: "Measure Max ROM", description: "Please extend your arm to capture your maximum range of motion before proceeding.", variant: "warning" });
         return;
      }
      setStep(4);
      toast({ title: "Final Step", description: "Finalize your measurement.", variant: "default" });
    }
  };

  const startStrengthTestCountdown = () => {
    strengthTestDataRef.current = [];
    strengthTestStartTimeRef.current = Date.now();
    strengthTestEndTimeRef.current = Date.now() + 3000; 
    setStrengthTestActive(true);
    setTimer(3); 
    toast({ title: "Strength Test Started!", description: "Push against the brace with maximum force for 3 seconds."});
  }

  const handleEndTest = () => {
    setStrengthTestActive(false);
    
    const calculatedRomForPjhi = finalMaxRomValue !== null ? finalMaxRomValue : (romAtLockForStrengthTest !== null ? romAtLockForStrengthTest : TARGET_ROM_FOR_STRENGTH_TEST);

    let maxStrength = 0;
    let avgStrength = 0;
    let relevantStrengthPoints = [];

    if (strengthTestDataRef.current && strengthTestDataRef.current.length > 0) {
        relevantStrengthPoints = strengthTestDataRef.current
            .filter(p_filter => p_filter.timestamp >= strengthTestStartTimeRef.current && p_filter.timestamp <= strengthTestEndTimeRef.current)
            .map(p_map => p_map.value);

        if (relevantStrengthPoints.length > 0) {
            maxStrength = Math.max(...relevantStrengthPoints);
            const sumStrength = relevantStrengthPoints.reduce((acc, val) => acc + val, 0);
            avgStrength = sumStrength / relevantStrengthPoints.length;
        }
    }
    
    const strengthData = {
        max: parseFloat(maxStrength.toFixed(2)),
        avg: parseFloat(avgStrength.toFixed(2))
    };
    
    const allCollectedPoints = strengthTestDataRef.current.map(p_map_all => ({...p_map_all, isRelevant: (p_map_all.timestamp >= strengthTestStartTimeRef.current && p_map_all.timestamp <= strengthTestEndTimeRef.current)}));

    updateResults(calculatedRomForPjhi, strengthData, allCollectedPoints, isBaselineSetting); 
    
    const toastMessage = isBaselineSetting 
      ? `Baseline ROM: ${calculatedRomForPjhi}°,\nAvg Force: ${strengthData.avg} lbs. Saved.`
      : `Test Ended! ROM: ${calculatedRomForPjhi}°,\nAvg Strength: ${strengthData.avg} lbs. Results saved.`;

    toast({
      title: isBaselineSetting ? "Baseline Saved!" : "Test Ended!",
      description: toastMessage,
      variant: "success",
      duration: 5000,
    });
    navigate('/');
  };

  const instructions = [
    { 
      title: `Step 1: Extend to ${TARGET_ROM_FOR_STRENGTH_TEST}° ${isBaselineSetting ? '(Baseline)' : ''}`, 
      text: `Place your arm and device on a hard, flat surface. Start in a contracted position. Slowly extend your limb to around ${TARGET_ROM_FOR_STRENGTH_TEST} degrees. The circle shows your progress. Once it turns green, click 'Lock Brace & Proceed'.`, 
      icon: <Target className="w-12 h-12 text-blue-500 dark:text-blue-400" /> 
    },
    { 
      title: `Step 2: Strength Test ${isBaselineSetting ? '(Baseline)' : ''}`, 
      text: `Ensure the brace is locked at ~${TARGET_ROM_FOR_STRENGTH_TEST}°. When ready, press 'Start Strength Test' and PUSH against the brace with maximum force for 3 seconds.`, 
      icon: <Zap className="w-12 h-12 text-orange-500 dark:text-orange-400" /> 
    },
    { 
      title: `Step 3: Measure Maximum ROM ${isBaselineSetting ? '(Baseline)' : ''}`, 
      text: "Strength test complete! Unlock the brace. Now, continue extending your arm to your absolute maximum comfortable range of motion. Click 'Reached Max ROM' when done.", 
      icon: <Activity className="w-12 h-12 text-green-500 dark:text-green-400" /> 
    },
    { 
      title: `Step 4: Finalize ${isBaselineSetting ? 'Baseline' : 'Test'}`, 
      text: `Press '${endButtonText}' to save your measurement results.`, 
      icon: isBaselineSetting ? <Save className="w-12 h-12 text-green-500 dark:text-green-400" /> : <StopCircle className="w-12 h-12 text-red-500 dark:text-red-400" /> 
    }
  ];

  const currentInstruction = instructions[step - 1];
  const chartLabel = strengthTestActive ? `Live Strength Test ${isBaselineSetting ? '(Baseline)' : ''} (lbs)` : `Measurement Data ${isBaselineSetting ? '(Baseline)' : ''}`;
  const progressPercentage = Math.min(100, (currentAngleForProgress / TARGET_ROM_FOR_STRENGTH_TEST) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-900 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center p-4 sm:p-8 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-blue-300 dark:border-blue-600">
          <CardHeader className="items-center relative">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="absolute top-4 left-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </motion.div>
            <CardTitle className="text-2xl sm:text-3xl pt-12 sm:pt-4 text-center">{currentInstruction.title}</CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">Follow the instructions carefully for accurate results.</CardDescription>
            
            {liveRomValue !== null && (
              <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Current Angle: <span className="font-bold text-lg">{liveRomValue.toFixed(1)}°</span>
                  {step === 3 && finalMaxRomValue !== null && (
                    <span className="ml-2 text-xs">
                      (Max ROM this phase: {finalMaxRomValue.toFixed(1)}°)
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4 sm:space-y-6 py-6 sm:py-8">
            <motion.div 
              key={step + (strengthTestActive ? '-active' : '') + (isBaselineSetting ? '-baseline' : '')} 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col items-center space-y-3 sm:space-y-4"
            >
              <div className="p-3 sm:p-4 bg-blue-100 dark:bg-blue-800 rounded-full">
                {currentInstruction.icon}
              </div>
              <p className="text-md sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300 px-2 sm:px-4">
                {currentInstruction.text}
              </p>
              {step === 1 && (
                <div className="my-4">
                  <ProgressCircle percentage={progressPercentage} size={120} strokeWidth={12} targetReached={targetRomReachedForStrengthTest} />
                  {targetRomReachedForStrengthTest && <p className="mt-2 text-green-600 dark:text-green-400 font-semibold">Target Reached! Lock brace.</p>}
                </div>
              )}
              {step === 2 && strengthTestActive && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl sm:text-6xl font-bold text-green-500 dark:text-green-400"
                >
                  {timer}
                </motion.div>
              )}
            </motion.div>
            {strengthTestActive && currentMeasurementPhaseData.length > 0 && (
              <motion.div 
                className="w-full h-40 sm:h-48 md:h-64 mt-3 sm:mt-4 px-1 sm:px-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-slate-50 dark:bg-slate-700/50">
                  <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
                    <CardTitle className="text-sm sm:text-lg flex items-center">
                      <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                      {chartLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-3">
                     <ForceDataChart data={currentMeasurementPhaseData} yAxisLabel="Force (lbs)" highlightRelevant={true} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 pt-4 sm:pt-6">
            {step === 1 && (
              <Button onClick={handleNextStep} size="lg" className={`${targetRomReachedForStrengthTest ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'} text-white font-semibold text-sm sm:text-base`} disabled={!targetRomReachedForStrengthTest}>
                <Lock className="mr-2 h-5 w-5" /> Lock Brace & Proceed
              </Button>
            )}
            {step === 2 && !strengthTestActive && (
              <Button onClick={startStrengthTestCountdown} size="lg" className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold text-sm sm:text-base">
                Start Strength Test <Zap className="ml-2 h-5 w-5" />
              </Button>
            )}
            {step === 2 && strengthTestActive && (
              <Button disabled size="lg" className="bg-gray-400 text-white font-semibold text-sm sm:text-base">
                Hold... ({timer}s)
              </Button>
            )}
            {step === 3 && (
               <Button onClick={handleNextStep} size="lg" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm sm:text-base">
                <Unlock className="mr-2 h-5 w-5" /> Reached Max ROM <ChevronsRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleEndTest} size="lg" 
                className={`${isBaselineSetting ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'} text-white font-semibold text-sm sm:text-base`}
              >
                {endButtonText} {endButtonIcon}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default MeasurementPage;
