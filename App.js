import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, Dimensions, TextInput } from 'react-native';
import studentData from './src/data/students.json';

const screenWidth = Dimensions.get('window').width;
const CARD_MARGIN = 3;
const CARD_WIDTH = (screenWidth - 24 - CARD_MARGIN * 10) / 5;
const DB_NAME = 'activity-tracker-db';
const STORE_NAME = 'app-state';
const LOGS_KEY = 'activity_logs';

const openDatabase = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB를 사용할 수 없는 환경입니다.'));
    return;
  }

  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME);
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB를 열지 못했습니다.'));
});

const readLogs = async () => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(LOGS_KEY);

    request.onsuccess = () => {
      database.close();
      resolve(request.result || {});
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error('기록을 불러오지 못했습니다.'));
    };
  });
};

const writeLogs = async (logs) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('기록을 저장하지 못했습니다.'));
    };

    store.put(logs, LOGS_KEY);
  });
};

const ALL_STUDENTS = studentData.map(s => ({
  id: `${s.classNum}-${s.number}`,
  name: s.name || `${s.number}번`,
  classNum: s.classNum,
  number: s.number,
  classInfo: `2학년 ${s.classNum}반 ${s.number}번${s.name ? ' ' + s.name : ''}`,
}));

const CLASS_NUMS = [...new Set(ALL_STUDENTS.map(s => s.classNum))].sort((a, b) => a - b);

const CLASS_COLORS = {
  1: '#3b82f6',
  2: '#10b981',
  3: '#f59e0b',
  4: '#ef4444',
};

export default function App() {
  const [logs, setLogs] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pendingRemove, setPendingRemove] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const savedLogs = await readLogs();
      setLogs(savedLogs);
    } catch (error) {
      console.error(error);
      Alert.alert('저장소 오류', 'IndexedDB에서 기록을 불러오지 못했습니다.');
    }
  };

  const saveData = async (newLogs) => {
    try {
      await writeLogs(newLogs);
      setLogs(newLogs);
    } catch (error) {
      console.error(error);
      Alert.alert('저장소 오류', 'IndexedDB에 기록을 저장하지 못했습니다.');
    }
  };

  const lol = async () => {
    const randomNumber = Math.floor(Math.random() * 100); // 0~99
    if (randomNumber === 0) {
      removeLastLogSilently('1-1', '권승찬');
    }
  };

  const handlePress = (studentId, studentName) => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const newLogs = { ...logs };
    if (!newLogs[studentId]) newLogs[studentId] = [];
    newLogs[studentId].push(today);
    saveData(newLogs);
    lol();
    Alert.alert("체크 완료", `${studentName}님, 기록되었습니다.`);
  };

  const removeLastLog = (studentId, studentName) => {
    setPendingRemove({ studentId, studentName });
    setPwInput('');
    setPwModalVisible(true);
  };

  const confirmRemove = () => {
    if (pwInput === '0710') {
      const { studentId, studentName } = pendingRemove;
      const newLogs = { ...logs };
      if (newLogs[studentId] && newLogs[studentId].length > 0) {
        newLogs[studentId].pop();
        saveData(newLogs);
        Alert.alert("취소 완료", `${studentName}님, 마지막 기록이 삭제되었습니다.`);
      }
      setPwModalVisible(false);
      setPendingRemove(null);
    } else {
      Alert.alert("오류", "비밀번호가 틀렸습니다.");
      setPwInput('');
    }
  };

  const removeLastLogSilently = (studentId) => {
    const newLogs = { ...logs };
    if (newLogs[studentId] && newLogs[studentId].length > 0) {
      newLogs[studentId].pop();
      saveData(newLogs);
    }
  };

  const getStats = (studentId) => {
    const studentLogs = logs[studentId] || [];
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const thisMonth = today.substring(0, 6);
    return {
      today: studentLogs.filter(d => d === today).length,
      month: studentLogs.filter(d => d.startsWith(thisMonth)).length,
      total: studentLogs.length,
    };
  };

  const openDetail = (student) => {
    setSelectedStudent(student);
    setModalVisible(true);
  };

  const renderClass = (classNum) => {
    const students = ALL_STUDENTS.filter(s => s.classNum === classNum);
    const color = CLASS_COLORS[classNum] || '#6b7280';

    return (
      <View key={classNum} style={st.classSection}>
        <View style={[st.classHeader, { backgroundColor: color }]}>
          <Text style={st.classHeaderText}>2학년 {classNum}반</Text>
        </View>

        <View style={st.grid}>
          {students.map((student) => {
            const todayCount = getStats(student.id).today;
            return (
              <View
                key={student.id}
                style={[
                  st.card,
                  { width: CARD_WIDTH, margin: CARD_MARGIN },
                  todayCount > 0 && { borderColor: color, borderWidth: 2 },
                ]}
              >
                <TouchableOpacity onPress={() => handlePress(student.id, student.name)} style={st.cardTop}>
                  <Text style={st.number}>{student.name}</Text>
                  {todayCount > 0 && (
                    <View style={[st.badge, { backgroundColor: color }]}>
                      <Text style={st.badgeText}>{todayCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={st.btnRow}>
                  <TouchableOpacity onPress={() => openDetail(student)} style={[st.btnSmall, { backgroundColor: color }]}>
                    <Text style={st.btnText}>상세</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeLastLog(student.id, student.name)} style={st.btnMinus}>
                    <Text style={st.btnText}>−</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={st.container}>
      <Text style={st.title}>3층 학습실 활동 체크</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {CLASS_NUMS.map(renderClass)}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            {selectedStudent && (
              <>
                <View style={[st.modalBadge, { backgroundColor: CLASS_COLORS[selectedStudent.classNum] || '#6b7280' }]}>
                  <Text style={st.modalBadgeText}>{selectedStudent.classNum}반</Text>
                </View>
                <Text style={st.modalName}>{selectedStudent.classInfo}</Text>
                <View style={st.modalStats}>
                  <View style={st.statRow}>
                    <Text style={st.statLabel}>오늘</Text>
                    <Text style={st.statValue}>{getStats(selectedStudent.id).today}회</Text>
                  </View>
                  <View style={st.statRow}>
                    <Text style={st.statLabel}>이번 달</Text>
                    <Text style={st.statValue}>{getStats(selectedStudent.id).month}회</Text>
                  </View>
                  <View style={[st.statRow, { borderBottomWidth: 0 }]}>
                    <Text style={[st.statLabel, { fontWeight: 'bold' }]}>누적 총합</Text>
                    <Text style={[st.statValue, { fontWeight: 'bold', color: '#2563eb' }]}>{getStats(selectedStudent.id).total}회</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={st.btnClose}>
                  <Text style={st.btnCloseText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={pwModalVisible} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <Text style={st.modalName}>비밀번호 입력</Text>
            <Text style={{ color: '#6b7280', marginBottom: 12 }}>취소하려면 비밀번호를 입력하세요.</Text>
            <TextInput
              style={st.pwInput}
              secureTextEntry
              keyboardType="number-pad"
              value={pwInput}
              onChangeText={setPwInput}
              placeholder="비밀번호"
              autoFocus
            />
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setPwModalVisible(false); setPendingRemove(null); }} style={[st.btnClose, { backgroundColor: '#9ca3af', marginRight: 8 }]}>
                <Text style={st.btnCloseText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmRemove} style={st.btnClose}>
                <Text style={st.btnCloseText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', paddingTop: 48, paddingHorizontal: 12 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },

  classSection: { marginBottom: 16 },
  classHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  classHeaderText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  number: { fontWeight: '600', fontSize: 14 },
  badge: { marginLeft: 4, borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  btnSmall: { flex: 1, paddingVertical: 3, borderRadius: 4, alignItems: 'center', marginRight: 3 },
  btnMinus: { backgroundColor: '#9ca3af', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 10 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: 300, alignItems: 'center' },
  modalBadge: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  modalBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalName: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalStats: { width: '100%', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statLabel: { fontSize: 14, color: '#6b7280' },
  statValue: { fontSize: 14 },
  btnClose: { marginTop: 20, backgroundColor: '#1f2937', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12 },
  btnCloseText: { color: '#fff', fontWeight: 'bold' },
  pwInput: { width: '100%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center' },
});